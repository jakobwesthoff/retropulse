// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
use tauri::State;

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

enum PlayerCommand {
    Load(String),
    Play,
    Pause,
    Terminate,
}

struct Player {
    sender: Option<mpsc::Sender<PlayerCommand>>,
    join_handle: Option<JoinHandle<()>>,
}

impl Drop for Player {
    fn drop(&mut self) {
        self.terminate();
    }
}

impl Player {
    pub fn spawn() -> Self {
        let mut player = Self {
            sender: None,
            join_handle: None,
        };
        player.spawn_thread();

        player
    }

    fn spawn_thread(&mut self) {
        let (sender, receiver) = mpsc::channel::<PlayerCommand>();
        self.sender = Some(sender);

        self.join_handle = Some(std::thread::spawn(move || {
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
                        stream = Some(
                            cpal_dev
                                .build_output_stream(
                                    &cfg,
                                    move |data: &mut [f32], _cpal| {
                                        mod_handle.read(cfg.sample_rate.0 as _, data)
                                    },
                                    |err| {
                                        dbg!(err);
                                    },
                                    None,
                                )
                                .unwrap(),
                        );
                    }
                    PlayerCommand::Play => {
                        println!("Play");
                        if let Some(ref stream) = stream {
                            stream.play().unwrap();
                        }
                    }
                    PlayerCommand::Pause => {
                        println!("Pause");
                        if let Some(ref stream) = stream {
                            stream.pause().unwrap();
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
        let Some(ref sender) = self.sender else {
            panic!("Unable to get Player channel for sending");
        };

        sender
    }

    fn terminate(&mut self) {
        let sender = self.get_channel();

        sender.send(PlayerCommand::Terminate).unwrap();

        if self.join_handle.is_some() {
            let join_handle = self.join_handle.take().unwrap();
            join_handle.join().unwrap();
        }

        self.sender = None;
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
}

fn main() {
    let player = Player::spawn();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_module,
            play_module,
            pause_module
        ])
        .manage(Mutex::new(player))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
