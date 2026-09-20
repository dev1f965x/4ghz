# 2. Build 4GHz as a Tauri desktop app

Status: accepted
Date: 2026-09-20

## Context

The app watches a schedule and interrupts the player when something is about to start.
It has to sit on a desktop, survive being minimized, and raise a notification without a
browser tab being open. It stores nothing personal and talks to one static feed.

## Options

- **Web app.** Reachable everywhere, but notifications depend on the browser staying
  open and on permissions that browsers increasingly restrict.
- **Electron.** Mature and well documented. Ships a full Chromium, so a window that
  shows a list costs over a hundred megabytes and a lot of memory.
- **Tauri 2.** Uses the operating system's webview and a Rust core. Installers are a few
  megabytes, notifications and tray are first-party plugins, and the Rust side gives room
  for background work later.

## Decision

Tauri 2, with the window as the only surface for 1.0.0.

## Consequences

The Rust toolchain becomes a build requirement, and the webview differs by platform, so
rendering is verified on the target platform rather than assumed. In return the install
is small, the app is idle-cheap, and scheduled refreshes can move into Rust when the
feed grows.
