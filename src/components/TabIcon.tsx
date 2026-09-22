import type { Tab } from "../navigation/tabs";

/**
 * Line drawings of 📅, 🎫, and ✅. Emoji fonts on Windows draw in colour whatever the
 * text colour is, so the shapes are drawn here and take `currentColor` — which lets the
 * selected tab wear the theme's colour.
 */
export function TabIcon({ tab }: { tab: Tab }) {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[tab]}
    </svg>
  );
}

const ICONS: Record<Tab, React.ReactNode> = {
  schedule: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  codes: (
    <>
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4Z" />
      <path d="M14.5 6.5v2M14.5 11v2M14.5 15.5v2" />
    </>
  ),
  dailies: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="m8 12.5 3 3 5-6.5" />
    </>
  ),
};
