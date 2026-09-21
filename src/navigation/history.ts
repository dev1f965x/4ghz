export type Tab = "schedule" | "codes" | "dailies";

export const TABS: readonly Tab[] = ["schedule", "codes", "dailies"];

/** Visited tabs and where the player stands among them, as a browser keeps its history. */
export interface History {
  readonly entries: readonly Tab[];
  readonly index: number;
}

export function startAt(tab: Tab): History {
  return { entries: [tab], index: 0 };
}

export function currentTab(history: History): Tab {
  return history.entries[history.index];
}

/** Opening a tab drops whatever lay ahead, the way following a link does after going back. */
export function visit(history: History, tab: Tab): History {
  if (currentTab(history) === tab) return history;

  return {
    entries: [...history.entries.slice(0, history.index + 1), tab],
    index: history.index + 1,
  };
}

export function canGoBack(history: History): boolean {
  return history.index > 0;
}

export function canGoForward(history: History): boolean {
  return history.index < history.entries.length - 1;
}

export function back(history: History): History {
  return canGoBack(history) ? { ...history, index: history.index - 1 } : history;
}

export function forward(history: History): History {
  return canGoForward(history) ? { ...history, index: history.index + 1 } : history;
}
