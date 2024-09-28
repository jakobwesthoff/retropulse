// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use player::Player;
use tauri::{ActivationPolicy, Manager};
use std::sync::Mutex;

mod commands;
mod openmpt;
mod player;
mod tray;
mod winamp;
mod config;

fn main() {
    let player = Player::spawn();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_positioner::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_config,
            commands::load_module,
            commands::play_module,
            commands::pause_module,
            commands::stop_module,
            commands::next_module,
            commands::previous_module,
            commands::seek_module,
            commands::subscribe_to_player_events,
            commands::unsubscribe_from_player_events,
            commands::get_winamp_sprite_map,
        ])
        .manage(Mutex::new(player))
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            main_window.open_devtools();

            app.manage(Mutex::new(config::AppConfig::load(app.handle())?));

            #[cfg(target_os = "macos")]
            {
                tray::init_macos_menu_extra(app.handle())?;
                // Make the Dock icon invisible
                app.set_activation_policy(ActivationPolicy::Accessory);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
