// The app's local state: loaded once before the first render, saved after every change unless
// the app runs read-only. I/O is injected so the behavior is unit-tested.
import { parseLocalState, type ReadOnlyReason } from "./load";
import type { LocalState } from "./schema";

export type LocalStore = {
  state: LocalState;
  /** Why the app runs read-only this session, or null when changes are saved. */
  readOnly: ReadOnlyReason | null;
  /** The last save failed; cleared by the next one that succeeds. */
  saveFailed: boolean;
};

type Deps = {
  read: () => Promise<string | null>;
  write: (contents: string) => Promise<void>;
  logError: (message: string, error: unknown) => void;
};

export function createLocalStore(deps: Deps) {
  let snapshot: LocalStore = {
    state: parseLocalState(null).state,
    readOnly: null,
    saveFailed: false,
  };
  const listeners = new Set<() => void>();
  // Saves run one after another, so an older state never overwrites a newer one.
  let saving: Promise<void> = Promise.resolve();

  const publish = (next: LocalStore) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load() {
      let text: string | null;
      try {
        text = await deps.read();
      } catch (error) {
        deps.logError("Reading state.json failed", error);
        publish({ ...snapshot, readOnly: "unreadable" });
        return;
      }
      const result = parseLocalState(text);
      publish({
        ...snapshot,
        state: result.state,
        readOnly: result.kind === "read-only" ? result.reason : null,
      });
    },
    /** Applies a change and saves it; in read-only mode the change lasts for this session only. */
    update(change: (state: LocalState) => LocalState) {
      const state = change(snapshot.state);
      publish({ ...snapshot, state });
      if (snapshot.readOnly !== null) return saving;
      const contents = JSON.stringify(state);
      saving = saving.then(() =>
        deps.write(contents).then(
          () => {
            if (snapshot.saveFailed) publish({ ...snapshot, saveFailed: false });
          },
          (error: unknown) => {
            // The change stays on screen; a banner says it may be lost when the app closes.
            deps.logError("Saving state.json failed", error);
            publish({ ...snapshot, saveFailed: true });
          },
        ),
      );
      return saving;
    },
  };
}
