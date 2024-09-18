use crate::player::{Player, PlayerEvent};
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn load_module(player: State<Mutex<Player>>, filepath: &str) {
    player.lock().unwrap().load(filepath);
}

#[tauri::command]
pub fn play_module(player: State<Mutex<Player>>) {
    player.lock().unwrap().play();
}

#[tauri::command]
pub fn pause_module(player: State<Mutex<Player>>) {
    player.lock().unwrap().pause();
}

#[tauri::command]
pub fn stop_module(player: State<Mutex<Player>>) {
    player.lock().unwrap().stop();
}

#[tauri::command]
pub fn next_module(player: State<Mutex<Player>>) {
    player.lock().unwrap().next();
}

#[tauri::command]
pub fn previous_module(player: State<Mutex<Player>>) {
    player.lock().unwrap().previous();
}

#[tauri::command]
pub fn subscribe_to_player_events(
    player: State<Mutex<Player>>,
    channel: tauri::ipc::Channel<PlayerEvent>,
) -> String {
    eprintln!("Subscribing to player events");
    dbg!(player.lock().unwrap().subscribe_to_events(channel))
}

#[tauri::command]
pub fn unsubscribe_from_player_events(player: State<Mutex<Player>>, id: String) -> bool {
    eprintln!("Unsubscribing from player events with {}", id);
    dbg!(player.lock().unwrap().unsubscribe_from_events(id))
}
