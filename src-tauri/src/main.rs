// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::{mpsc, Mutex};

use std::thread::JoinHandle;
use std::{
    ffi::{c_void, CStr},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Duration,
};

use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SampleFormat, SampleRate, SupportedStreamConfigRange,
};
use serde::Serialize;
use tauri::State;
use uuid::Uuid;

fn desired_config(cfg: &SupportedStreamConfigRange) -> bool {
    cfg.channels() == 2
        && cfg.sample_format() == SampleFormat::F32
        && cfg.max_sample_rate() >= SampleRate(48_000)
}

struct Module {
    handle: *mut libopenmpt_sys::openmpt_module,
    pub playback_end: Arc<AtomicBool>,
}

impl Module {
    fn read(&mut self, rate: i32, data: &mut [f32]) {
        unsafe {
            let n_read = libopenmpt_sys::openmpt_module_read_interleaved_float_stereo(
                self.handle,
                rate,
                data.len() / 2,
                data.as_mut_ptr(),
            );
            if n_read == 0 {
                self.playback_end.store(true, Ordering::SeqCst);
            }
        };
    }

    fn get_duration_seconds(&self) -> f64 {
        unsafe { libopenmpt_sys::openmpt_module_get_duration_seconds(self.handle) }
    }

    fn get_position_seconds(&self) -> f64 {
        unsafe { libopenmpt_sys::openmpt_module_get_position_seconds(self.handle) }
    }
}

unsafe impl Send for Module {}

extern "C" fn logfunc(message: *const ::std::os::raw::c_char, _user: *mut ::std::os::raw::c_void) {
    let openmpt_log_msg = unsafe { CStr::from_ptr(message) };
    dbg!(openmpt_log_msg);
}

#[tauri::command]
fn load_module(player: State<Mutex<Player>>, filepath: &str) {
    player.lock().unwrap().load(filepath);
}

#[tauri::command]
fn play_module(player: State<Mutex<Player>>) {
    player.lock().unwrap().play();
}

#[tauri::command]
fn pause_module(player: State<Mutex<Player>>) {
    player.lock().unwrap().pause();
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
enum PlayerEvent {
    Playing,
    Paused,
    PositionUpdated { position: f64, duration: f64 },
}

#[tauri::command]
fn subscribe_to_player_events(
    player: State<Mutex<Player>>,
    channel: tauri::ipc::Channel<PlayerEvent>,
) -> String {
    eprintln!("Subscribing to player events");
    dbg!(player.lock().unwrap().subscribe_to_events(channel))
}

#[tauri::command]
fn unsubscribe_from_player_events(player: State<Mutex<Player>>, id: String) -> bool {
    eprintln!("Unsubscribing from player events with {}", id);
    dbg!(player.lock().unwrap().unsubscribe_from_events(id))
}

enum PlayerCommand {
    Load(String),
    Play,
    Pause,
    Terminate,
}

struct Player {
    playback_sender: Option<mpsc::Sender<PlayerCommand>>,
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

        let (sender, receiver) = mpsc::channel::<PlayerEvent>();
        player.spawn_event_thread(receiver);
        player.spawn_playback_thread(sender);

        player
    }

    fn spawn_event_thread(&mut self, receiver: mpsc::Receiver<PlayerEvent>) {
        let subscribers_mutex = self.subscribers.clone();
        self.events_join_handle = Some(std::thread::spawn(move || 'receive_loop: loop {
            let event = receiver.recv().unwrap();
            let subscribers = subscribers_mutex.lock().unwrap();
            for subscriber in subscribers.values() {
                subscriber.send(event.clone()).unwrap();
            }
            drop(subscribers);
        }));
    }

    fn spawn_playback_thread(&mut self, event_sender: mpsc::Sender<PlayerEvent>) {
        let (sender, receiver) = mpsc::channel::<PlayerCommand>();
        self.playback_sender = Some(sender);

        self.playback_join_handle = Some(std::thread::spawn(move || {
            let event_sender = Arc::new(event_sender);
            let mut stream = None;

            'receive_loop: loop {
                match receiver.recv().unwrap() {
                    PlayerCommand::Load(filepath) => {
                        println!("Load filepath {}", filepath);
                        let mod_data = std::fs::read(filepath).unwrap();
                        let mod_handle = unsafe {
                            libopenmpt_sys::openmpt_module_create_from_memory2(
                                mod_data.as_ptr() as *const c_void,
                                mod_data.len(),
                                Some(logfunc),
                                std::ptr::null_mut(),
                                None,
                                std::ptr::null_mut(),
                                std::ptr::null_mut(),
                                std::ptr::null_mut(),
                                std::ptr::null(),
                            )
                        };
                        if mod_handle.is_null() {
                            eprintln!("Failed to create module. Exiting");
                            return;
                        }
                        let playback_over = Arc::new(AtomicBool::new(false));
                        let mut mod_handle = Module {
                            handle: mod_handle,
                            playback_end: playback_over.clone(),
                        };
                        let cpal_host = cpal::default_host();
                        let cpal_dev = cpal_host.default_output_device().unwrap();
                        let mut supported_cfgs = cpal_dev.supported_output_configs().unwrap();
                        let Some(cfg) = supported_cfgs.find(desired_config) else {
                            println!("Output device doesn't support desired parameters");
                            return;
                        };
                        let cfg = cfg.with_sample_rate(SampleRate(48_000)).config();
                        {
                            let event_sender = event_sender.clone();
                            stream = Some(
                                cpal_dev
                                    .build_output_stream(
                                        &cfg,
                                        move |data: &mut [f32], _cpal| {
                                            mod_handle.read(cfg.sample_rate.0 as _, data);
                                            event_sender
                                                .send(PlayerEvent::PositionUpdated {
                                                    position: mod_handle.get_position_seconds(),
                                                    duration: mod_handle.get_duration_seconds(),
                                                })
                                                .unwrap();
                                        },
                                        |err| {
                                            dbg!(err);
                                        },
                                        None,
                                    )
                                    .unwrap(),
                            );
                        }

                        event_sender.send(PlayerEvent::Playing).unwrap();
                    }
                    PlayerCommand::Play => {
                        println!("Play");
                        if let Some(ref stream) = stream {
                            stream.play().unwrap();
                            event_sender.send(PlayerEvent::Playing).unwrap();
                        }
                    }
                    PlayerCommand::Pause => {
                        println!("Pause");
                        if let Some(ref stream) = stream {
                            stream.pause().unwrap();
                            event_sender.send(PlayerEvent::Paused).unwrap();
                        }
                    }
                    PlayerCommand::Terminate => {
                        break 'receive_loop;
                    }
                }
            }
        }));
    }

    fn get_channel(&self) -> &mpsc::Sender<PlayerCommand> {
        let Some(ref sender) = self.playback_sender else {
            panic!("Unable to get Player channel for sending");
        };

        sender
    }

    fn terminate(&mut self) {
        let sender = self.get_channel();

        sender.send(PlayerCommand::Terminate).unwrap();

        if self.playback_join_handle.is_some() {
            let join_handle = self.playback_join_handle.take().unwrap();
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

fn main() {
    let player = Player::spawn();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_module,
            play_module,
            pause_module,
            subscribe_to_player_events,
            unsubscribe_from_player_events
        ])
        .manage(Mutex::new(player))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
