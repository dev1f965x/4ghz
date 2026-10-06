import { expect, test } from "./fixtures";

test.use({ localFiles: { state: '{"schemaVersion":1}' } });

type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };

// Guards the harness itself: stories read and write local files through these mocks.
test("serves local files through the mocked storage commands", async ({ app }) => {
  const result = await app.evaluate(async () => {
    const { invoke } = (window as unknown as { __TAURI_INTERNALS__: Internals })
      .__TAURI_INTERNALS__;
    const before = await invoke("read_store", { file: "state" });
    await invoke("write_store", { file: "state", contents: "{}" });
    const after = await invoke("read_store", { file: "state" });
    const unknown = await invoke("read_store", { file: "settings" }).catch(() => "rejected");
    return { before, after, unknown };
  });
  expect(result).toEqual({ before: '{"schemaVersion":1}', after: "{}", unknown: "rejected" });
});
