import type { KeyboardEvent } from "react";
import { NAVIGATION_LABELS, TAB_LABELS } from "../domain/labels";
import { TABS, type Tab } from "../navigation/history";
import { TabIcon } from "./TabIcon";
import "./TabBar.css";

interface Props {
  tab: Tab;
  onOpen: (tab: Tab) => void;
}

export const tabId = (tab: Tab) => `tab-${tab}`;
export const panelId = (tab: Tab) => `panel-${tab}`;

/**
 * The three views, as ARIA tabs splitting the width in three. Each shows an icon and is
 * named for screen readers and tooltips. Arrow keys move between them and open the one
 * they land on; Alt with an arrow is left alone for back and forward.
 */
export function TabBar({ tab, onOpen }: Props) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey) return;
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;

    event.preventDefault();
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length];
    onOpen(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <div
      className="tab-bar"
      role="tablist"
      aria-label={NAVIGATION_LABELS.tabs}
      onKeyDown={onKeyDown}
      data-tour="tabs"
    >
      {TABS.map((each) => (
        <button
          key={each}
          type="button"
          role="tab"
          id={tabId(each)}
          className="tab-bar__tab"
          aria-selected={each === tab}
          aria-controls={panelId(each)}
          tabIndex={each === tab ? 0 : -1}
          aria-label={TAB_LABELS[each]}
          title={TAB_LABELS[each]}
          onClick={() => onOpen(each)}
        >
          <TabIcon tab={each} />
        </button>
      ))}
    </div>
  );
}
