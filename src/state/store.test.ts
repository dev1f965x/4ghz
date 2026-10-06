import { describe, expect, it, vi } from "vitest";
import { parseLocalState } from "./load";
import { defaultLocalState } from "./schema";
import { createLocalStore } from "./store";

const saved = (patch: object = {}) =>
  JSON.stringify({
    ...defaultLocalState(),
    settings: { ...defaultLocalState().settings, ...patch },
  });

describe("parseLocalState", () => {
  it("starts with defaults on a first run", () => {
    expect(parseLocalState(null)).toEqual({ kind: "ready", state: defaultLocalState() });
  });

  it("reads a saved file", () => {
    const result = parseLocalState(saved({ lastGame: "zzz", lastTab: "calendar" }));
    expect(result.kind === "ready" && result.state.settings).toMatchObject({
      lastGame: "zzz",
      lastTab: "calendar",
    });
  });

  it.each([
    ["damaged", "{not json", "invalid"],
    ["not an object", "null", "invalid"],
    ["missing fields", JSON.stringify({ schemaVersion: 1 }), "invalid"],
    ["an unknown game", saved({ lastGame: "wuwa" }), "invalid"],
    ["from a newer app", JSON.stringify({ schemaVersion: 2, anything: true }), "newer"],
  ])("runs read-only for a file that is %s", (_, text, reason) => {
    expect(parseLocalState(text)).toEqual({
      kind: "read-only",
      reason,
      state: defaultLocalState(),
    });
  });
});

function setup(read: () => Promise<string | null>) {
  const writes: string[] = [];
  const logError = vi.fn();
  const store = createLocalStore({
    read,
    write: (contents) => {
      writes.push(contents);
      return Promise.resolve();
    },
    logError,
  });
  return { store, writes, logError };
}

describe("local store", () => {
  it("saves every change", async () => {
    const { store, writes } = setup(() => Promise.resolve(null));
    await store.load();
    await store.update((s) => ({ ...s, settings: { ...s.settings, lastGame: "hsr" } }));
    expect(store.getSnapshot().state.settings.lastGame).toBe("hsr");
    expect(JSON.parse(writes[0]).settings.lastGame).toBe("hsr");
  });

  it("never writes in read-only mode, but keeps the change for the session", async () => {
    const { store, writes } = setup(() => Promise.resolve("{not json"));
    await store.load();
    expect(store.getSnapshot().readOnly).toBe("invalid");
    await store.update((s) => ({ ...s, settings: { ...s.settings, lastTab: "codes" } }));
    expect(store.getSnapshot().state.settings.lastTab).toBe("codes");
    expect(writes).toEqual([]);
  });

  it("runs read-only when the file cannot be read", async () => {
    const { store, logError } = setup(() => Promise.reject(new Error("access denied")));
    await store.load();
    expect(store.getSnapshot().readOnly).toBe("unreadable");
    expect(logError).toHaveBeenCalled();
  });

  it("writes changes in order", async () => {
    const { store, writes } = setup(() => Promise.resolve(null));
    await store.load();
    store.update((s) => ({ ...s, settings: { ...s.settings, lastGame: "hsr" } }));
    await store.update((s) => ({ ...s, settings: { ...s.settings, lastGame: "zzz" } }));
    expect(writes.map((w) => JSON.parse(w).settings.lastGame)).toEqual(["hsr", "zzz"]);
  });

  it("logs a failed save and keeps the change", async () => {
    const logError = vi.fn();
    const store = createLocalStore({
      read: () => Promise.resolve(null),
      write: () => Promise.reject(new Error("disk full")),
      logError,
    });
    await store.load();
    await store.update((s) => ({ ...s, settings: { ...s.settings, lastGame: "hsr" } }));
    expect(store.getSnapshot().state.settings.lastGame).toBe("hsr");
    expect(logError).toHaveBeenCalledWith("Saving state.json failed", expect.any(Error));
  });
});
