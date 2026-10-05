# Stored license texts

Some npm packages that ship in the app publish only an SPDX identifier and no license text. The texts below come from the packages' upstream source, unmodified, and `scripts/notices.mjs` uses them for the third-party notices.

| Folder | Packages | Source |
| --- | --- | --- |
| `tauri-plugins-workspace/` | `@tauri-apps/plugin-*` (MIT OR Apache-2.0) | [tauri-apps/plugins-workspace at 2a9c29e](https://github.com/tauri-apps/plugins-workspace/tree/2a9c29e004325db674fd904089749c38f4aac824) |

When a new package without a license file is added, the notice script stops and names it. Add its upstream texts here, with the source, and map the package in `scripts/notices.mjs`.
