//! Local files in the app's local data folder (%LOCALAPPDATA%\<identifier>).
//! The web view names a file by kind and never passes a path.

use std::fs::{self, File};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum StoreFile {
    /// Settings and history.
    State,
    /// The last valid data file.
    DataCache,
}

impl StoreFile {
    fn file_name(self) -> &'static str {
        match self {
            StoreFile::State => "state.json",
            StoreFile::DataCache => "data-cache.json",
        }
    }
}

#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "kind", content = "message", rename_all = "kebab-case")]
pub enum StorageError {
    #[error("the local data folder is unavailable: {0}")]
    NoDataFolder(String),
    #[error("reading failed: {0}")]
    Read(String),
    #[error("writing failed: {0}")]
    Write(String),
}

fn data_folder<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, StorageError> {
    app.path()
        .app_local_data_dir()
        .map_err(|e| StorageError::NoDataFolder(e.to_string()))
}

/// Returns `None` when the file does not exist yet, so a first run is not reported as an error.
fn read_file(path: &Path) -> Result<Option<String>, StorageError> {
    match fs::read_to_string(path) {
        Ok(contents) => Ok(Some(contents)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(StorageError::Read(e.to_string())),
    }
}

/// Writes to a temporary file, flushes it to disk, and renames it over the target,
/// so a crash or power loss leaves either the old or the new file, never a partial one.
fn write_file_atomic(path: &Path, contents: &str) -> Result<(), StorageError> {
    let write_err = |e: std::io::Error| StorageError::Write(e.to_string());
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder).map_err(write_err)?;
    }
    let temp = path.with_extension("json.tmp");
    let mut file = File::create(&temp).map_err(write_err)?;
    file.write_all(contents.as_bytes()).map_err(write_err)?;
    file.sync_all().map_err(write_err)?;
    drop(file);
    // On Windows, std::fs::rename replaces an existing file (MoveFileEx with REPLACE_EXISTING).
    fs::rename(&temp, path).map_err(write_err)
}

#[tauri::command]
pub fn read_store<R: Runtime>(
    app: AppHandle<R>,
    file: StoreFile,
) -> Result<Option<String>, StorageError> {
    read_file(&data_folder(&app)?.join(file.file_name()))
}

#[tauri::command]
pub fn write_store<R: Runtime>(
    app: AppHandle<R>,
    file: StoreFile,
    contents: String,
) -> Result<(), StorageError> {
    write_file_atomic(&data_folder(&app)?.join(file.file_name()), &contents)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_file_is_none() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(read_file(&dir.path().join("state.json")).unwrap(), None);
    }

    #[test]
    fn write_then_read_round_trips_and_creates_the_folder() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("state.json");
        write_file_atomic(&path, "{\"a\":1}").unwrap();
        assert_eq!(read_file(&path).unwrap().as_deref(), Some("{\"a\":1}"));
    }

    #[test]
    fn write_replaces_an_existing_file_and_leaves_no_temporary_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("state.json");
        write_file_atomic(&path, "old").unwrap();
        write_file_atomic(&path, "new").unwrap();
        assert_eq!(read_file(&path).unwrap().as_deref(), Some("new"));
        assert!(!path.with_extension("json.tmp").exists());
    }

    #[test]
    fn reading_a_folder_is_a_read_error() {
        let dir = tempfile::tempdir().unwrap();
        assert!(matches!(read_file(dir.path()), Err(StorageError::Read(_))));
    }

    #[test]
    fn writing_over_a_folder_is_a_write_error() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("state.json");
        fs::create_dir(&path).unwrap();
        assert!(matches!(
            write_file_atomic(&path, "x"),
            Err(StorageError::Write(_))
        ));
    }

    #[test]
    fn store_files_have_fixed_names() {
        assert_eq!(StoreFile::State.file_name(), "state.json");
        assert_eq!(StoreFile::DataCache.file_name(), "data-cache.json");
        let parsed: StoreFile = serde_json::from_str("\"data-cache\"").unwrap();
        assert!(matches!(parsed, StoreFile::DataCache));
    }
}
