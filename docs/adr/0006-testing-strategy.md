# 6. Test with Vitest, Testing Library, and cargo test

Status: accepted
Date: 2026-09-20

## Context

Two things can break in ways a reader will not notice: the arithmetic that turns an
instant into "in 3 days", and the parsing of a feed that someone edits by hand. The UI
around them is a list and a toggle.

## Options

- **Unit tests only.** Cheap, but nothing proves the list renders what the dates mean.
- **Add WebDriver end-to-end tests.** Tauri supports `tauri-driver` with WebdriverIO,
  which drives the real window. It needs a display, is slow on Windows CI, and is fragile
  while the interface is still moving.
- **Unit tests plus component tests.** Vitest for the date and feed logic, Testing Library
  for the components that show them, and `cargo test` for the Rust side.

## Decision

Vitest with Testing Library for the frontend, `cargo test` for Rust, and a schema check
of the feed in CI. End-to-end tests through `tauri-driver` are deferred until the
interface settles, tracked in issue #2 rather than skipped silently.

## Consequences

A regression in the window itself, such as a component that never mounts, can still reach
a release. The build step catches missing modules, and the release checklist includes
opening the built installer once. When the interface stops changing weekly, the deferred
end-to-end suite closes that gap.
