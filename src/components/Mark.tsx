/** The 4GHz mark: the app icon's three bars, one per game, next to the name. */
export function Mark() {
  return (
    // Part of the title bar: the name drags the window like the empty space around it.
    <span
      data-tauri-drag-region
      className="inline-flex items-center gap-2 font-bold tracking-tight whitespace-nowrap"
    >
      <svg aria-hidden viewBox="0 0 16 14" className="pointer-events-none h-3.5 w-4">
        <rect x="0" y="0" width="4" height="14" rx="1" className="fill-genshin" />
        <rect x="6" y="4" width="4" height="10" rx="1" className="fill-hsr" />
        <rect x="12" y="8" width="4" height="6" rx="1" className="fill-zzz" />
      </svg>
      4GHz
    </span>
  );
}
