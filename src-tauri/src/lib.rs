mod storage;

use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

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
        // The data folder is opened from Rust (storage::open_data_folder), never by a web path.
        .plugin(tauri_plugin_opener::init())
        // Copies redeem codes; the capability grants only writing text.
        .plugin(tauri_plugin_clipboard_manager::init())
        // Errors from both sides go to rotated files in the app's log folder
        // (%LOCALAPPDATA%<identifier>ogs): at most three files of 1 MB. Messages carry no
        // paths or personal data; the web view logs through src/log.ts.
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .targets([
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Stdout),
                ])
                .level(log::LevelFilter::Info)
                .max_file_size(1_000_000)
                .rotation_strategy(RotationStrategy::KeepSome(3))
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            storage::read_store,
            storage::write_store,
            storage::data_folder_name,
            storage::open_data_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
