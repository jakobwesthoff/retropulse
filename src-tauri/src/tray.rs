use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};
use tauri_plugin_positioner::WindowExt;

pub fn init_macos_menu_extra<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit_i])?;

    let _ = TrayIconBuilder::with_id("menu_extra")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            // @TODO: Add and handle more menu entries, like play, pause, open, ...
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            let app = tray.app_handle();

            tauri_plugin_positioner::on_tray_event(app.app_handle(), &event);

            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Some(window) = app.get_webview_window("main") {
                    if !window.is_visible().unwrap_or(false) {
                      let _ = window.move_window(tauri_plugin_positioner::Position::TrayBottomCenter);
                      let _ = window.show();
                      let _ = window.set_focus();
                    } else {
                      let _ = window.hide();
                    }
                }
            }
        })
        .build(app);

    Ok(())
}
