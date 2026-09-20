import { renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import type { Feed } from "../domain/feed";
import type { FeedCache, FeedSource } from "./ports";
import { useFeedSync } from "./useFeedSync";

const feed: Feed = {
  schemaVersion: "1.0",
  publishedAt: new Date("2026-09-20T00:00:00Z"),
  events: [],
};

const source: FeedSource = {
  async fetch() {
    return { ok: true, feed };
  },
};

const cache: FeedCache = {
  async read() {
    return undefined;
  },
  async write() {},
};

describe("useFeedSync", () => {
  it("starts loading and settles on what it fetched", async () => {
    const { result } = renderHook(() => useFeedSync(source, cache));

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
  });

  it("still loads when React mounts the effect twice", async () => {
    const { result } = renderHook(() => useFeedSync(source, cache), { wrapper: StrictMode });

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
  });

  it("fetches again when asked", async () => {
    let calls = 0;
    const counting: FeedSource = {
      async fetch() {
        calls += 1;
        return { ok: true, feed };
      },
    };

    const { result } = renderHook(() => useFeedSync(counting, cache));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    result.current.refresh();
    await waitFor(() => expect(calls).toBe(2));
  });
});
