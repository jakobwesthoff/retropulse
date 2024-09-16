use crate::openmpt;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, SampleRate, SupportedStreamConfigRange};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{mpsc, Arc, Mutex};
use std::thread::JoinHandle;
use uuid::Uuid;

fn desired_config(cfg: &SupportedStreamConfigRange) -> bool {
    cfg.channels() == 2
        && cfg.sample_format() == SampleFormat::F32
        && cfg.max_sample_rate() >= SampleRate(48_000)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum PlayerEvent {
    Loaded {
        metadata: Vec<openmpt::module::Metadata>,
        duration: f64,
    },
    Playing,
    Paused,
    PositionUpdated {
        position: f64,
        duration: f64,
    },
    Terminated,
}

enum PlayerCommand {
    Load(String),
    Play,
    Pause,
    Terminate,
}

pub struct Player {
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

            if let PlayerEvent::Terminated = event {
                break 'receive_loop;
            }
        }));
    }

    fn spawn_playback_thread(&mut self, event_sender: mpsc::Sender<PlayerEvent>) {
        let (sender, receiver) = mpsc::channel::<PlayerCommand>();
        self.playback_sender = Some(sender);

        self.playback_join_handle = Some(std::thread::spawn(move || {
            let event_sender = Arc::new(event_sender);
            let mut stream = None;

            // @TODO: Handle errors in playback thread without panicking
            'receive_loop: loop {
                match receiver.recv().unwrap() {
                    PlayerCommand::Load(filepath) => {
                        println!("Load filepath {}", filepath);
                        let data = std::fs::read(filepath).unwrap();
                        let mut module = openmpt::module::Module::try_from_memory(&data).unwrap();
                        let metadata = module.get_metadata();
                        let module_duration = module.get_duration_seconds();

                        let cpal_host = cpal::default_host();
                        let cpal_dev = cpal_host.default_output_device().unwrap();
                        let mut supported_cfgs = cpal_dev.supported_output_configs().unwrap();
                        let Some(cfg) = supported_cfgs.find(desired_config) else {
                            panic!("Output device doesn't support desired parameters");
                        };
                        let cfg = cfg.with_sample_rate(SampleRate(48_000)).config();

                        let mut samples_since_last_position_update = 0;
                        {
                            let event_sender = event_sender.clone();
                            stream = Some(
                                cpal_dev
                                    .build_output_stream(
                                        &cfg,
                                        move |data: &mut [f32], _cpal| {
                                            module.read(cfg.sample_rate.0 as _, data);
                                            // Send updates limited to once every half second
                                            samples_since_last_position_update += data.len() / 2;
                                            if samples_since_last_position_update
                                                / (cfg.sample_rate.0 as usize / 2)
                                                >= 1
                                            {
                                                samples_since_last_position_update = 0;
                                                event_sender
                                                    .send(PlayerEvent::PositionUpdated {
                                                        position: module.get_position_seconds(),
                                                        duration: module_duration,
                                                    })
                                                    .unwrap();
                                            }
                                        },
                                        |err| {
                                            dbg!(err);
                                        },
                                        None,
                                    )
                                    .unwrap(),
                            );
                        }

                        event_sender
                            .send(PlayerEvent::Loaded {
                                metadata: metadata.to_vec(),
                                duration: module_duration,
                            })
                            .unwrap();

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
                        event_sender.send(PlayerEvent::Terminated).unwrap();
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
