import { expect, test } from "./fixtures";

test.use({ localFiles: { state: '{"schemaVersion":1}' } });

// Guards the harness itself: later stories read and write local files through these mocks.
test("serves local files through the mocked storage commands", async ({ app }) => {
  const result = await app.evaluate(async () => {
    type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };
    const { invoke } = (window as unknown as { __TAURI_INTERNALS__: Internals })
      .__TAURI_INTERNALS__;
    const before = await invoke("read_store", { file: "state" });
    const missing = await invoke("read_store", { file: "data-cache" });
    await invoke("write_store", { file: "data-cache", contents: "{}" });
    const after = await invoke("read_store", { file: "data-cache" });
    return { before, missing, after };
  });
  expect(result).toEqual({ before: '{"schemaVersion":1}', missing: null, after: "{}" });
});
