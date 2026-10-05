# 4ghz

English | [한국어](README.ko.md)

An unofficial Windows app with schedules, redeem codes, and a chore calendar for Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero.

4ghz is not affiliated with or endorsed by the publishers or owners of these games. Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero are trademarks of their respective owners.

## Development

The app is developed natively on Windows 11. Install these first:

- Visual Studio Build Tools with the “Desktop development with C++” workload
- Rust through rustup
- mise, which installs the Node.js, pnpm, cargo-deny, and cargo-about versions the repository pins

Run `mise install` once in the repository to get the pinned tools, then `pnpm install`.

<!-- This table is the only list of commands; AGENTS.md links here. -->

| Script | Purpose |
| --- | --- |
| `pnpm app:dev` | Run the app with hot reload |
| `pnpm app:build` | Build the release app and the per-user installer (`src-tauri/target/release/bundle/nsis`) |
| `pnpm check` | All checks: Biome, type check, knip, design tokens and color contrast, UI text, tests, license check, `pnpm audit`, rustfmt, Clippy, Rust tests, and cargo-deny |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm license-check` | Check npm package licenses against the project's license policy |
| `pnpm notices` | Write the third-party notices to `public/third-party-notices.txt`; `pnpm app:build` runs it |
| `pnpm tokens` | Regenerate `src/tokens.css` and the `DESIGN.md` front matter after changing `design/visual/tokens.json` |
| `pnpm content-check` | Check UI text against the banned patterns in `CONTENT.md` |
| `pnpm format` | Format TypeScript, JSON, CSS, and Rust |
| `pnpm dev` | Run only the web frontend in a browser at http://localhost:1420 |
| `pnpm build` | Type check and build only the web frontend |
| `pnpm tauri <command>` | Run other Tauri CLI commands, for example `pnpm tauri icon design/icon/app-icon.svg` |

## License

[MIT](LICENSE)
