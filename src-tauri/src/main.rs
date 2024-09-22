// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use player::Player;
use std::sync::Mutex;

mod commands;
mod openmpt;
mod player;
mod tray;

fn main() {
    let player = Player::spawn();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_positioner::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_module,
            commands::play_module,
            commands::pause_module,
            commands::stop_module,
            commands::next_module,
            commands::previous_module,
            commands::seek_module,
            commands::subscribe_to_player_events,
            commands::unsubscribe_from_player_events
        ])
        .manage(Mutex::new(player))
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                tray::init_macos_menu_extra(app.handle())?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
