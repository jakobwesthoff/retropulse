use crate::openmpt;
use cpal::traits::{DeviceTrait, HostTrait};
use cpal::{SampleFormat, SampleRate, SupportedStreamConfigRange};
use crossbeam::channel::{bounded, Receiver, Sender};
use serde::Serialize;
use std::collections::HashMap;

use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use uuid::Uuid;

#[derive(Eq, PartialEq, Copy, Clone)]
enum AudioContextState {
    Stopped,
    Playing,
}

struct AudioContext {
    playlist: Playlist,
    module: Option<openmpt::module::Module>,
    module_duration: Option<f64>,
    module_position: Option<f64>,
    module_metadata: Option<Arc<Vec<openmpt::module::Metadata>>>,
    event_sender: Sender<PlayerEvent>,
    state: AudioContextState,
    samples_since_last_position_update: usize,
}

impl AudioContext {
    pub fn new(event_sender: Sender<PlayerEvent>) -> Arc<Mutex<Self>> {
        Arc::new(Mutex::new(Self {
            playlist: Playlist::default(),
            module: None,
            module_duration: None,
            module_position: None,
            module_metadata: None,
            event_sender,
            state: AudioContextState::Stopped,
            samples_since_last_position_update: 0,
        }))
    }
}

impl AudioContext {
    fn desired_config(cfg: &SupportedStreamConfigRange) -> bool {
        cfg.channels() == 2
            && cfg.sample_format() == SampleFormat::F32
            && cfg.max_sample_rate() >= SampleRate(48_000)
    }

    fn create_cpal_stream(context: Arc<Mutex<AudioContext>>) -> cpal::Stream {
        // @TODO: Allow user configuration of properties
        let cpal_host = cpal::default_host();
        let cpal_device = cpal_host.default_output_device().unwrap();
        let mut supported_cfgs = cpal_device.supported_output_configs().unwrap();
        let Some(cfg) = supported_cfgs.find(AudioContext::desired_config) else {
            panic!("Output device doesn't support desired parameters");
        };
        let cfg = cfg.with_sample_rate(SampleRate(48_000)).config();

        cpal_device
            .build_output_stream(
                &cfg,
                move |data: &mut [f32], _cpal| {
                    context.lock().unwrap().read(cfg.sample_rate.0 as _, data);
                },
                |err| {
                    dbg!(err);
                },
                None,
            )
            .unwrap()
    }

    fn read(&mut self, rate: i32, data: &mut [f32]) {
        if self.state == AudioContextState::Stopped {
            data.fill(0.0);
            return;
        }

        // Nothing is currently playing and no module is loaded (paused)
        if self.module.is_none() {
            if !self.activate_current() {
                self.stop();
                return;
            }
        }

        // We reached the end of the current module. Go to the next one
        if !self.module.as_mut().unwrap().read(rate, data) {
            if !self.activate_next() {
                self.stop();
                return;
            }
        }

        // Send updates limited to once every half second
        self.samples_since_last_position_update += data.len() / 2;
        if self.samples_since_last_position_update / (48_000 as usize / 2) >= 1
            || self.samples_since_last_position_update == 0
        {
            self.samples_since_last_position_update = 0;
            self.event_sender
                .send(PlayerEvent::PositionUpdated {
                    position: self.module.as_ref().unwrap().get_position_seconds(),
                    duration: self.module_duration.unwrap(),
                })
                .unwrap();
        }
    }

    fn activate_module(&mut self, module: openmpt::module::Module) {
        self.module = Some(module);
        self.module_duration = Some(self.module.as_ref().unwrap().get_duration_seconds());
        self.module_position = Some(0.0);
        self.module_metadata = Some(self.module.as_ref().unwrap().get_metadata());

        let filepath = self.playlist.files[self.playlist.current_index].clone();
        let filename = std::path::Path::new(&filepath)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();

        self.event_sender
            .send(PlayerEvent::Loaded {
                filepath,
                filename,
                metadata: self.module_metadata.as_ref().unwrap().to_vec(),
                duration: self.module_duration.unwrap(),
            })
            .unwrap();
    }

    fn activate_current(&mut self) -> bool {
        match self.playlist.current() {
            Some(module) => {
                self.activate_module(module);
                true
            }
            None => false,
        }
    }

    fn activate_next(&mut self) -> bool {
        match self.playlist.next() {
            Some(module) => {
                self.activate_module(module);
                true
            }
            None => false,
        }
    }

    fn activate_previous(&mut self) -> bool {
        match self.playlist.previous() {
            Some(module) => {
                self.activate_module(module);
                true
            }
            None => false,
        }
    }

    pub fn load(&mut self, filepath: &str) {
        self.stop();
        self.playlist
            .load_directory(filepath, PlaylistReadMode::RECURSIVE);
        self.playlist.dump();
        self.play();
    }

    pub fn play(&mut self) {
        self.state = AudioContextState::Playing;
    }

    pub fn pause(&mut self) {
        if self.state == AudioContextState::Playing {
            self.state = AudioContextState::Stopped;
        }
    }

    pub fn stop(&mut self) {
        if self.state == AudioContextState::Playing {
            self.state = AudioContextState::Stopped;
        }
        self.module = None;
        self.module_duration = None;
        self.module_position = None;
        self.module_metadata = None;
    }

    pub fn previous(&mut self) {
        self.stop();
        self.activate_previous();
        self.play();
    }

    pub fn next(&mut self) {
        self.stop();
        self.activate_next();
        self.play();
    }

    pub fn seek(&mut self, position: f64) {
        if self.module.is_some() {
            self.module.as_mut().unwrap().set_position_seconds(position);
        }
        self.event_sender
            .send(PlayerEvent::Seeked {
                position,
                duration: self.module_duration.unwrap(),
            })
            .unwrap();
    }
}

struct Playlist {
    files: Vec<String>,
    current_index: usize,
}

#[derive(Eq, PartialEq, Copy, Clone)]
enum PlaylistReadMode {
    FLAT,
    RECURSIVE,
}

impl Playlist {
    pub fn from_directory(filepath: &str, mode: PlaylistReadMode) -> Self {
        let files = Self::read_directory(filepath, mode);
        Self {
            files,
            current_index: 0,
        }
    }

    pub fn load_directory(&mut self, filepath: &str, mode: PlaylistReadMode) {
        self.files = Self::read_directory(filepath, mode);
        self.current_index = 0;
    }

    fn read_directory(filepath: &str, mode: PlaylistReadMode) -> Vec<String> {
        let mut files = vec![];
        for entry in std::fs::read_dir(filepath).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            if path.is_file() {
                files.push(path.to_str().unwrap().to_string());
            } else if path.is_dir() && mode == PlaylistReadMode::RECURSIVE {
                files.append(&mut Self::read_directory(path.to_str().unwrap(), mode));
            }
        }

        files
    }

    fn try_open_module(filepath: &str) -> Option<openmpt::module::Module> {
        // @TODO: Should we limit the maximum filesize here?
        let data = std::fs::read(filepath).unwrap();
        match openmpt::module::Module::try_from_memory(&data) {
            Ok(module) => Some(module),
            Err(_) => None,
        }
    }

    pub fn previous(&mut self) -> Option<openmpt::module::Module> {
        while self.current_index > 0 && self.current_index - 1 < self.files.len() {
            self.current_index -= 1;
            let filepath = &self.files[self.current_index];
            eprintln!(
                "Trying to open previous file in queue {} of {}: {}",
                self.current_index + 1,
                self.files.len(),
                filepath
            );
            if let Some(module) = Self::try_open_module(filepath) {
                return Some(module);
            }
        }

        eprintln!("No more files in queue");
        return None;
    }

    pub fn current(&mut self) -> Option<openmpt::module::Module> {
        if self.current_index < self.files.len() {
            let filepath = &self.files[self.current_index];
            eprintln!(
                "Trying to open current file in queue {} of {}: {}",
                self.current_index + 1,
                self.files.len(),
                filepath
            );
            if let Some(module) = Self::try_open_module(filepath) {
                return Some(module);
            } else {
                // In case current can't be played (is not a module), try the
                // next one.
                return self.next();
            }
        }

        eprintln!("Queue empty");
        return None;
    }

    pub fn next(&mut self) -> Option<openmpt::module::Module> {
        while self.current_index + 1 < self.files.len() {
            self.current_index += 1;
            let filepath = &self.files[self.current_index];
            eprintln!(
                "Trying to open next file in queue {} of {}: {}",
                self.current_index + 1,
                self.files.len(),
                filepath
            );
            if let Some(module) = Self::try_open_module(filepath) {
                return Some(module);
            }
        }

        eprintln!("No more files in queue");
        return None;
    }

    pub fn dump(&self) {
        eprintln!("Playlist:");
        for (i, file) in self.files.iter().enumerate() {
            eprintln!("{}: {}", i, file);
        }
    }
}

impl Default for Playlist {
    fn default() -> Self {
        Self {
            files: vec![],
            current_index: 0,
        }
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum PlayerEvent {
    Loaded {
        filename: String,
        filepath: String,
        metadata: Vec<openmpt::module::Metadata>,
        duration: f64,
    },
    Playing,
    Paused,
    Stopped,
    PositionUpdated {
        position: f64,
        duration: f64,
    },
    Seeked {
        position: f64,
        duration: f64,
    },
    Terminated,
}

enum PlayerCommand {
    Load(String),
    Play,
    Pause,
    Stop,
    Previous,
    Next,
    Seek(f64),
    Terminate,
}

pub struct Player {
    playback_sender: Option<Sender<PlayerCommand>>,
    playback_join_handle: Option<JoinHandle<()>>,
    events_join_handle: Option<JoinHandle<()>>,
    subscribers: Arc<Mutex<HashMap<String, tauri::ipc::Channel<PlayerEvent>>>>,
}

impl Drop for Player {
    fn drop(&mut self) {
        self.terminate();
    }
}

impl Player {
    pub fn spawn() -> Self {
        let mut player = Self {
            playback_sender: None,
            playback_join_handle: None,
            events_join_handle: None,
            subscribers: Arc::new(Mutex::new(HashMap::new())),
        };

        let (sender, receiver) = bounded::<PlayerEvent>(0);
        player.spawn_event_thread(receiver);
        player.spawn_playback_thread(sender);

        player
    }

    fn spawn_event_thread(&mut self, receiver: Receiver<PlayerEvent>) {
        let subscribers_mutex = self.subscribers.clone();
        self.events_join_handle = Some(std::thread::spawn(move || 'receive_loop: loop {
            let event = receiver.recv().unwrap();
            let subscribers = subscribers_mutex.lock().unwrap();
            for subscriber in subscribers.values() {
                subscriber.send(event.clone()).unwrap();
            }
            drop(subscribers);

            if let PlayerEvent::Terminated = event {
                break 'receive_loop;
            }
        }));
    }

    fn spawn_playback_thread(&mut self, event_sender: Sender<PlayerEvent>) {
        let (player_sender, receiver) = bounded::<PlayerCommand>(0);
        self.playback_sender = Some(player_sender.clone());

        self.playback_join_handle = Some(std::thread::spawn(move || {
            let event_sender = event_sender.clone();
            let audio_context = AudioContext::new(event_sender.clone());
            let stream = AudioContext::create_cpal_stream(audio_context.clone());

            // @TODO: Handle errors in playback thread without panicking
            'receive_loop: loop {
                match receiver.recv().unwrap() {
                    PlayerCommand::Load(filepath) => {
                        println!("Load filepath {}", filepath);
                        audio_context.lock().unwrap().load(&filepath);

                        event_sender.send(PlayerEvent::Playing).unwrap();
                    }

                    PlayerCommand::Play => {
                        println!("Play");
                        audio_context.lock().unwrap().play();
                        event_sender.send(PlayerEvent::Playing).unwrap();
                    }
                    PlayerCommand::Pause => {
                        println!("Pause");
                        audio_context.lock().unwrap().pause();
                        event_sender.send(PlayerEvent::Paused).unwrap();
                    }
                    PlayerCommand::Stop => {
                        println!("Stop");
                        audio_context.lock().unwrap().stop();
                        event_sender.send(PlayerEvent::Stopped).unwrap();
                    }
                    PlayerCommand::Previous => {
                        println!("Previous");
                        audio_context.lock().unwrap().previous();
                    }
                    PlayerCommand::Next => {
                        println!("Next");
                        audio_context.lock().unwrap().next();
                    }
                    PlayerCommand::Terminate => {
                        event_sender.send(PlayerEvent::Terminated).unwrap();
                        break 'receive_loop;
                    }
                    PlayerCommand::Seek(position) => {
                        println!("Seek: {}", position);
                        audio_context.lock().unwrap().seek(position);
                    }
                }
            }
        }));
    }

    fn get_channel(&self) -> Sender<PlayerCommand> {
        let Some(ref sender) = self.playback_sender else {
            panic!("Unable to get Player channel for sending");
        };

        sender.clone()
    }

    fn terminate(&mut self) {
        let sender = self.get_channel();

        sender.send(PlayerCommand::Terminate).unwrap();

        if self.playback_join_handle.is_some() {
            let join_handle = self.playback_join_handle.take().unwrap();
            join_handle.join().unwrap();
        }

        if self.events_join_handle.is_some() {
            let join_handle = self.events_join_handle.take().unwrap();
            join_handle.join().unwrap();
        }

        self.playback_sender = None;
    }

    pub fn load(&self, filepath: &str) {
        let sender = self.get_channel();

        sender
            .send(PlayerCommand::Load(String::from(filepath)))
            .unwrap();
    }

    pub fn play(&self) {
        let sender = self.get_channel();

        sender.send(PlayerCommand::Play).unwrap();
    }

    pub fn pause(&self) {
        let sender = self.get_channel();

        sender.send(PlayerCommand::Pause).unwrap();
    }

    pub fn stop(&self) {
        let sender = self.get_channel();
        sender.send(PlayerCommand::Stop).unwrap();
    }

    pub fn previous(&self) {
        let sender = self.get_channel();
        sender.send(PlayerCommand::Previous).unwrap();
    }

    pub fn next(&self) {
        let sender = self.get_channel();
        sender.send(PlayerCommand::Next).unwrap();
    }

    pub fn seek(&self, position: f64) {
        let sender = self.get_channel();
        sender.send(PlayerCommand::Seek(position)).unwrap();
    }

    pub fn subscribe_to_events(&mut self, channel: tauri::ipc::Channel<PlayerEvent>) -> String {
        let uuid = Uuid::new_v4().to_string();
        self.subscribers
            .lock()
            .unwrap()
            .insert(uuid.clone(), channel);
        uuid
    }

    pub fn unsubscribe_from_events(&mut self, uuid: String) -> bool {
        self.subscribers.lock().unwrap().remove(&uuid).is_some()
    }
}
