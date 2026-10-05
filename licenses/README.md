# Stored license texts

The texts below come from upstream sources, unmodified, and `scripts/notices.mjs` uses them for the third-party notices.

## npm packages without a license file

Some npm packages that ship in the app publish only an SPDX identifier and no license text.

| Folder | Packages | Source |
| --- | --- | --- |
| `tauri-plugins-workspace/` | `@tauri-apps/plugin-*` (MIT OR Apache-2.0) | [tauri-apps/plugins-workspace at 2a9c29e](https://github.com/tauri-apps/plugins-workspace/tree/2a9c29e004325db674fd904089749c38f4aac824) |

When a new package without a license file is added, the notice script stops and names it. Add its upstream texts here, with the source, and map the package in `scripts/notices.mjs`.

## Files bundled from outside npm

| Folder | Files | Source |
| --- | --- | --- |
| `jetbrains-mono/` | `src/fonts/JetBrainsMono-Regular.woff2` and `JetBrainsMono-Bold.woff2` (OFL-1.1), unmodified | [JetBrains Mono 2.304 release](https://github.com/JetBrains/JetBrainsMono/releases/tag/v2.304), `JetBrainsMono-2.304.zip` (SHA-256 `6f6376c6ed2960ea8a963cd7387ec9d76e3f629125bc33d1fdcd7eb7012f7bbf`), `fonts/webfonts/` and `OFL.txt` |
