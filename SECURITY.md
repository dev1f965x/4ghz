# Security policy

## Reporting a vulnerability

Report security issues privately through GitHub's private vulnerability reporting: open the repository's **Security** tab and select **Report a vulnerability**, or go to <https://github.com/dev1f965x/4ghz/security/advisories/new>.

Do not open a public issue for a security problem. Include the affected feature or file, steps to reproduce, and the impact you expect.

4ghz is maintained by one person, so reports are handled on a best-effort basis. You will get a reply in the advisory once the report has been reviewed.

## Supported versions

Fixes go to the `main` branch.

## Security checks

GitHub secret scanning with push protection, Dependabot alerts, and CodeQL are enabled for the repository. Every pull request runs `pnpm audit` for npm packages and cargo-deny for Rust crates in the Windows build. Renovate opens dependency update pull requests.

## Accepted advisories

| Advisory | Severity | Path | Why it is accepted | Reviewed | Revisit when |
| --- | --- | --- | --- | --- | --- |
| [GHSA-wrw7-89jp-8q8g](https://github.com/advisories/GHSA-wrw7-89jp-8q8g) (glib 0.18.5) | Medium | tauri → muda, tao, wry → gtk 0.18 → glib | glib is part of the Linux GTK backend. The app is built for Windows only, and `cargo tree -i glib --target x86_64-pc-windows-msvc` finds no glib in the Windows build. Tauri 2 (through tao, wry, and muda) requires the gtk 0.18 line, so glib cannot move to the fixed 0.20 line. | 2026-10-05 | Tauri moves to gtk 0.20 or later, or the app adds a Linux build |
