import { describe, expect, it } from "vitest";
import { findUpdate, isNewer, parseVersion } from "./check";

const answer = (tag: unknown) => () => Promise.resolve({ tag_name: tag });

describe("versions", () => {
  it("parses plain releases with or without a v", () => {
    expect(parseVersion("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("0.10.0")).toEqual([0, 10, 0]);
    expect(parseVersion("v1.2.3-beta.1")).toBeNull();
    expect(parseVersion("latest")).toBeNull();
  });

  it("compares numerically, not as text", () => {
    expect(isNewer([0, 10, 0], [0, 9, 9])).toBe(true);
    expect(isNewer([0, 1, 0], [0, 1, 0])).toBe(false);
    expect(isNewer([0, 0, 9], [0, 1, 0])).toBe(false);
  });
});

describe("findUpdate", () => {
  it("returns a newer release with a link to its page", async () => {
    await expect(findUpdate("0.1.0", answer("v0.2.0"))).resolves.toEqual({
      version: "0.2.0",
      url: "https://github.com/dev1f965x/4ghz/releases/tag/v0.2.0",
    });
  });

  it("returns nothing for the same or an older version, or an unusual tag", async () => {
    await expect(findUpdate("0.2.0", answer("v0.2.0"))).resolves.toBeNull();
    await expect(findUpdate("0.2.0", answer("v0.1.9"))).resolves.toBeNull();
    await expect(findUpdate("0.1.0", answer("nightly"))).resolves.toBeNull();
  });

  it("rejects an answer that is not a release, for the caller to log", async () => {
    await expect(
      findUpdate("0.1.0", () => Promise.resolve({ message: "Not Found" })),
    ).rejects.toThrow();
  });
});

describe("before any release", () => {
  it("finds nothing when GitHub has no release yet", async () => {
    await expect(findUpdate("0.1.0", () => Promise.resolve(null))).resolves.toBeNull();
  });
});
