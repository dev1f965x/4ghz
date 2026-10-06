// Reads, validates, and saves state.json. A file that fails validation or comes from a newer app
// is left untouched and the app runs read-only for the session, so no history is lost silently
// (Design Doc, "Local data").
import {
  defaultLocalState,
  LOCAL_STATE_VERSION,
  type LocalState,
  localStateSchema,
} from "./schema";

export type ReadOnlyReason = "unreadable" | "invalid" | "newer";

type LoadResult =
  | { kind: "ready"; state: LocalState }
  | { kind: "read-only"; reason: ReadOnlyReason; state: LocalState };

export function parseLocalState(text: string | null): LoadResult {
  if (text === null) return { kind: "ready", state: defaultLocalState() };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // A damaged file is reported to the user through the read-only state below.
    return { kind: "read-only", reason: "invalid", state: defaultLocalState() };
  }
  const version = (json as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === "number" && version > LOCAL_STATE_VERSION) {
    return { kind: "read-only", reason: "newer", state: defaultLocalState() };
  }
  const parsed = localStateSchema.safeParse(json);
  if (!parsed.success) return { kind: "read-only", reason: "invalid", state: defaultLocalState() };
  return { kind: "ready", state: parsed.data };
}
