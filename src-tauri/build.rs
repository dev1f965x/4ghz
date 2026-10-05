fn main() {
    // Declaring the app's commands makes each one require a permission in a capability,
    // so the web view can call only what capabilities/default.json grants.
    let manifest = tauri_build::AppManifest::new().commands(&["read_store", "write_store"]);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))
        .expect("failed to run the Tauri build script");
}
