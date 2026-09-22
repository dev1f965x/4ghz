# 13. Switch tabs from the tab bar only

Status: accepted
Date: 2026-09-22

Supersedes [10](0010-navigate-with-an-in-app-history.md).

## Context

1.1.0 shipped back and forward over the tabs: arrows at the left of the title bar,
`Alt+←`/`Alt+→`, and a mouse's side buttons. With three tabs one click away, the history
added a control that saved nothing, and the arrows took the bar's most prominent corner.

## Options

- **Keep the history, hide the arrows.** The shortcuts stay for whoever finds them, but
  the behaviour is then invisible and still has to be tested and explained.
- **Tab state only.** The tab bar is the one way to change views.

## Decision

Tab state only. The window opens on the schedule; the tab bar's buttons and its arrow keys
change the view. `src/navigation/` keeps the list of tabs and nothing else.

## Consequences

- The app's name starts the bar, on the content's left edge.
- `Alt+←`/`Alt+→` and the mouse's side buttons do nothing in the window.
- If views ever gain addresses of their own, a history is worth deciding again.
