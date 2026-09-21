# 10. Navigate with an in-app history

Status: accepted
Date: 2026-09-21

## Context

1.1.0 adds two tabs beside the schedule and asks for browser-style back and forward. The
window has no address bar, no deep links, and three views.

## Options

- **A router** (React Router, TanStack Router). Brings URL matching, nested routes, and
  loaders, none of which a three-view window uses, and ties back and forward to the
  webview's own history, which the title bar would then have to mirror.
- **Tab state only.** Simplest, but has no notion of back.
- **A small history stack.** A list of visited views and a cursor: visiting drops what lies
  ahead of the cursor and appends, back and forward move the cursor.

## Decision

A history stack in `src/navigation/`, owned by the app rather than the webview. The title
bar's arrows, `Alt+←`/`Alt+→`, and a mouse's side buttons all call the same two functions.

## Consequences

- Behaviour matches a browser, and the rules fit in a unit test with no DOM.
- Revisiting the current tab does nothing, so the stack only grows on real moves.
- If views ever gain their own addresses (a code, a date), the stack can hold those
  entries without changing its interface.
