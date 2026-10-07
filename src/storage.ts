// The app's local files, through the Rust storage commands (src-tauri/src/storage.rs).
import { invoke } from "@tauri-apps/api/core";

type StoreFile = "state" | "data-cache";

/** The file's contents, or null when it does not exist yet. */
export function readStore(file: StoreFile): Promise<string | null> {
  return invoke<string | null>("read_store", { file });
}

export function writeStore(file: StoreFile, contents: string): Promise<void> {
  return invoke<void>("write_store", { file, contents });
}

/** The data folder's name under %LOCALAPPDATA%: the app identifier. */
export function dataFolderName(): Promise<string> {
  return invoke<string>("data_folder_name");
}

/** Opens the data folder in File Explorer. */
export function openDataFolder(): Promise<void> {
  return invoke<void>("open_data_folder");
}
