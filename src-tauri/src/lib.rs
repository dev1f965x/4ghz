mod storage;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // One process owns the local files; a second launch focuses the existing window instead.
        // Keep this the first plugin, as the Tauri docs require.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus is best effort; the second process exits either way.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        // Opens official announcement links in the default browser; the capability limits the URLs.
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            storage::read_store,
            storage::write_store
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
