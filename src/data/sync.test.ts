import { describe, expect, it, vi } from "vitest";
import { classify } from "./classify";
import { createDataSync, type SyncDeps } from "./sync";

const game = { schedule: [], codes: [], chores: [], periods: [] };
const file = (updatedAt = "2026-10-06T10:00:00+09:00") => ({
  schemaVersion: 1,
  updatedAt,
  games: { genshin: game, hsr: game, zzz: game },
});
const NOW = Date.parse("2026-10-06T01:42:00Z");

function setup(options: {
  response?: () => Promise<Response>;
  cache?: string | null;
  writeCache?: SyncDeps["writeCache"];
}) {
  const writes: string[] = [];
  const logError = vi.fn();
  const deps: SyncDeps = {
    url: "https://example.test/data/v1.json",
    fetch: vi.fn(options.response ?? (() => Promise.resolve(Response.json(file())))),
    readCache: () => Promise.resolve(options.cache ?? null),
    writeCache:
      options.writeCache ??
      ((contents) => {
        writes.push(contents);
        return Promise.resolve();
      }),
    now: () => NOW,
    logError,
  };
  return { sync: createDataSync(deps), deps, writes, logError };
}

const cacheOf = (contents: unknown, savedAt = NOW - 3_600_000) =>
  JSON.stringify({ savedAt, file: contents });

describe("classify", () => {
  it.each([
    [file(), "valid"],
    [{ schemaVersion: 2, anything: true }, "unsupported"],
    [{ schemaVersion: 1, retired: true, updatedAt: "2027-01-01T00:00:00+09:00" }, "retired"],
    // A retired file is retired even if the rest no longer validates.
    [{ schemaVersion: 1, retired: true }, "retired"],
    [{ ...file(), games: {} }, "invalid"],
    [null, "invalid"],
    ["text", "invalid"],
  ])("%j is %s", (json, kind) => {
    expect(classify(json).kind).toBe(kind);
  });

  it("strips keys a newer additive version adds", () => {
    const result = classify({ ...file(), futureField: 1 });
    expect(result.kind === "valid" && "futureField" in result.file).toBe(false);
  });
});

describe("data sync", () => {
  it("downloads a valid file, uses it, and caches it", async () => {
    const { sync, writes } = setup({});
    await sync.start();
    expect(sync.getState()).toMatchObject({ status: "ok", checkedAt: NOW, problem: null });
    expect(sync.getState().data?.updatedAt).toBe("2026-10-06T10:00:00+09:00");
    expect(JSON.parse(writes[0])).toEqual({ savedAt: NOW, file: file() });
  });

  it("shows the cached copy before the download finishes", async () => {
    let finish: (r: Response) => void = () => {};
    const { sync } = setup({
      cache: cacheOf(file("2026-10-05T09:00:00+09:00")),
      response: () => new Promise((resolve) => (finish = resolve)),
    });
    const started = sync.start();
    await vi.waitFor(() => expect(sync.getState().data).not.toBeNull());
    expect(sync.getState()).toMatchObject({ status: "loading", checkedAt: NOW - 3_600_000 });
    finish(Response.json(file()));
    await started;
    expect(sync.getState().data?.updatedAt).toBe("2026-10-06T10:00:00+09:00");
  });

  it("keeps the cached copy and reports a failed refresh when offline", async () => {
    const { sync } = setup({
      cache: cacheOf(file()),
      response: () => Promise.reject(new TypeError("Failed to fetch")),
    });
    await sync.start();
    expect(sync.getState()).toMatchObject({ status: "failed", problem: null });
    expect(sync.getState().data).not.toBeNull();
  });

  it("has no data and a failed status on a first run without a network", async () => {
    const { sync } = setup({ response: () => Promise.reject(new TypeError("Failed to fetch")) });
    await sync.start();
    expect(sync.getState()).toMatchObject({ data: null, status: "failed", checkedAt: null });
  });

  it("treats an HTTP error as a failed refresh", async () => {
    const { sync } = setup({ response: () => Promise.resolve(new Response("", { status: 404 })) });
    await sync.start();
    expect(sync.getState().status).toBe("failed");
  });

  it.each([
    ["invalid", { ...file(), games: {} }],
    ["retired", { schemaVersion: 1, retired: true, updatedAt: "2027-01-01T00:00:00+09:00" }],
    ["unsupported", { schemaVersion: 2 }],
  ])("keeps the last valid copy when the download is %s", async (problem, json) => {
    const { sync, writes } = setup({
      cache: cacheOf(file()),
      response: () => Promise.resolve(Response.json(json)),
    });
    await sync.start();
    // The update time stays that of the cached copy still in use.
    expect(sync.getState()).toMatchObject({ status: "ok", problem, checkedAt: NOW - 3_600_000 });
    expect(sync.getState().data?.updatedAt).toBe("2026-10-06T10:00:00+09:00");
    expect(writes).toEqual([]);
  });

  it("clears a problem once a valid file arrives", async () => {
    let json: unknown = { schemaVersion: 1, retired: true };
    const { sync } = setup({ response: () => Promise.resolve(Response.json(json)) });
    await sync.start();
    expect(sync.getState().problem).toBe("retired");
    json = file();
    await sync.refresh();
    expect(sync.getState()).toMatchObject({ problem: null, status: "ok" });
  });

  it("has no data and no update time on a first run that gets a retired file", async () => {
    const { sync } = setup({
      response: () => Promise.resolve(Response.json({ schemaVersion: 1, retired: true })),
    });
    await sync.start();
    expect(sync.getState()).toMatchObject({ data: null, checkedAt: null, problem: "retired" });
  });

  it("treats a timed-out download as a failed refresh", async () => {
    const { sync } = setup({
      response: () => Promise.reject(new DOMException("The operation timed out.", "TimeoutError")),
    });
    await sync.start();
    expect(sync.getState().status).toBe("failed");
  });

  it("still downloads when the cache cannot be read", async () => {
    const { deps, logError } = setup({});
    deps.readCache = () => Promise.reject(new Error("access denied"));
    const fresh = createDataSync(deps);
    await fresh.start();
    expect(fresh.getState().status).toBe("ok");
    expect(logError).toHaveBeenCalledWith("Reading the data cache failed", expect.any(Error));
  });

  it.each([["null"], [JSON.stringify({ savedAt: 1, file: { schemaVersion: 2 } })]])(
    "logs a cache it cannot use: %s",
    async (cache) => {
      const { sync, logError } = setup({
        cache,
        response: () => Promise.reject(new TypeError("Failed to fetch")),
      });
      await sync.start();
      expect(sync.getState().data).toBeNull();
      expect(logError).toHaveBeenCalledWith("The data cache is not usable", expect.anything());
    },
  );

  it("ignores a cache that is not valid and logs why", async () => {
    const { sync, logError } = setup({
      cache: "{not json",
      response: () => Promise.reject(new TypeError("Failed to fetch")),
    });
    await sync.start();
    expect(sync.getState().data).toBeNull();
    expect(logError).toHaveBeenCalledWith("The data cache could not be read", expect.anything());
  });

  it("keeps the new data when saving the cache fails", async () => {
    const { sync, logError } = setup({ writeCache: () => Promise.reject(new Error("disk full")) });
    await sync.start();
    expect(sync.getState().data).not.toBeNull();
    expect(logError).toHaveBeenCalledWith("Saving the data cache failed", expect.any(Error));
  });

  it("shares one download between overlapping refreshes", async () => {
    const { sync, deps } = setup({});
    await Promise.all([sync.refresh(), sync.refresh()]);
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers on every change", async () => {
    const { sync } = setup({});
    const seen: string[] = [];
    sync.subscribe(() => seen.push(sync.getState().status));
    await sync.refresh();
    expect(seen).toEqual(["loading", "ok"]);
  });
});
