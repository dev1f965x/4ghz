// Errors go to the console (WebView2 developer tools in debug builds) and to the rotated log
// files kept by tauri-plugin-log. Messages name what failed; they never include file paths or
// anything about the user.
import { error as writeError } from "@tauri-apps/plugin-log";

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  // Rust command errors arrive as objects such as { kind, message }.
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      // Circular or BigInt values cannot be serialized; the type name still helps.
      return Object.prototype.toString.call(error);
    }
  }
  return String(error);
}

export function logError(message: string, error: unknown) {
  console.error(message, error);
  writeError(`${message}: ${describe(error)}`).catch((failure: unknown) =>
    // Nothing else can record it; the console still has the original error.
    console.error("Writing the log file failed", failure),
  );
}
