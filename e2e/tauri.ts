/** Store files by name, each a map of keys to values, as the store plugin keeps them. */
export type Stores = Record<string, Record<string, unknown>>;

/**
 * A stand-in for Tauri's IPC, as script text to run in the page before the app loads.
 *
 * The store plugin's files live in memory, seeded from `stores`, so a page can start
 * from any records. Every call is kept on `window.__invokes` and the files on
 * `window.__stores`, for tests to read back. It is text rather than a function because
 * it runs in the page, where helpers a TypeScript transform would add do not exist.
 */
export function tauriStandIn(stores: Stores): string {
  return `(() => {
    const data = ${JSON.stringify(stores)};
    const files = new Map();
    const invokes = [];
    let next = 1;
    const invoke = async (command, args = {}) => {
      invokes.push({ command, args });
      if (command === "plugin:store|load") {
        data[args.path] ??= {};
        files.set(next, args.path);
        return next++;
      }
      const file = data[files.get(args.rid)] ?? {};
      if (command === "plugin:store|get") return [file[args.key] ?? null, args.key in file];
      if (command === "plugin:store|set") file[args.key] = args.value;
      return null;
    };
    window.__invokes = invokes;
    window.__stores = data;
    window.__TAURI_INTERNALS__ = {
      invoke,
      transformCallback: () => 0,
      metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
    };
  })();`;
}
