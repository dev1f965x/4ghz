import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addMonths,
  type CalendarDay,
  calendarMonth,
  calendarToday,
  firstMonth,
  type GameMark as Mark,
  monthOf,
} from "@/calendar/model";
import { Button } from "@/components/ui/button";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import type { Locale } from "@/i18n/locale";
import { allPrefs, useLocalState } from "@/state/app-state";
import { type GameId, gameIds } from "@/state/schema";
import { addDays, gameDayLabel, gameDayStart } from "@/time/clock";
import { GRACE_MS } from "@/time/days";
import { formatLabelLong, formatMonth, weekdayNames } from "@/time/format";

/**
 * The month grid of completed days, a WAI-ARIA grid with a roving tabindex:
 * arrows move by day and week, Home and End to the week's ends, Page Up and Page Down by month.
 * It needs no data file: stored days show without one.
 */
export function MonthCalendar() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data } = useDataSync();
  const { state, readOnly } = useLocalState();
  const [boundary, setBoundary] = useState<number | null>(null);
  const now = useNow(30_000, boundary);
  const prefs = allPrefs(state);
  const today = calendarToday(prefs, now);
  // The grid changes when any game's day starts or its previous day's grace period ends.
  const next = Math.min(
    ...gameIds
      .filter((g) => prefs[g].plays || gameIds.every((other) => !prefs[other].plays))
      .map((g) => {
        const { region } = prefs[g];
        const label = gameDayLabel(now, region);
        const graceEnd = gameDayStart(label, region) + GRACE_MS;
        return graceEnd > now ? graceEnd : gameDayStart(addDays(label, 1), region);
      }),
  );
  useEffect(() => setBoundary(next), [next]);

  const current = monthOf(today);
  // A year either side of today, and further back to the first record.
  const recorded = firstMonth(state.chores, current);
  const yearBack = addMonths(current, -12);
  const earliest = recorded < yearBack ? recorded : yearBack;
  const latest = addMonths(current, 12);
  const [focused, setFocused] = useState(today);
  const month = monthOf(focused);
  const weeks = calendarMonth(
    { chores: state.chores, games: data?.games ?? null, prefs, now },
    month,
  );
  const titleId = useId();
  const grid = useRef<HTMLTableElement>(null);
  // Set when a key moved focus, so the newly rendered cell receives it.
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-label="${focused}"]`)?.focus();
  }, [focused]);

  const first = `${earliest}-01`;
  const last = addDays(`${addMonths(latest, 1)}-01`, -1);
  const clamp = (label: string) => (label < first ? first : label > last ? last : label);
  // Announces month changes made with the buttons, where focus stays on the button.
  const [announcement, setAnnouncement] = useState("");
  const goToMonth = (target: string) => {
    // Keeps the day of the month where it exists, as calendar apps do.
    const day = Math.min(Number(focused.slice(8)), daysIn(target));
    setFocused(clamp(`${target}-${String(day).padStart(2, "0")}`));
    setAnnouncement(formatMonth(target, locale));
  };
  const atStart = month <= earliest;
  const atEnd = month >= latest;

  const onKeyDown = (event: KeyboardEvent, day: CalendarDay) => {
    const weekday = (new Date(`${day.label}T00:00:00Z`).getUTCDay() + 6) % 7;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(day.label, -1),
      ArrowRight: () => addDays(day.label, 1),
      ArrowUp: () => addDays(day.label, -7),
      ArrowDown: () => addDays(day.label, 7),
      Home: () => addDays(day.label, -weekday),
      End: () => addDays(day.label, 6 - weekday),
      PageUp: () => shiftMonth(day.label, -1),
      PageDown: () => shiftMonth(day.label, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const target = clamp(move());
    // An unchanged label renders nothing, so the flag would stay set for a later change.
    if (target === focused) return;
    moveFocus.current = true;
    setFocused(target);
  };

  const markText = (mark: Mark, status: CalendarDay["status"]) => {
    if (mark === "not-done" && (status === "today" || status === "pending")) {
      return t("calendar.state.inProgress");
    }
    const keys = {
      done: "done",
      "not-done": "notDone",
      untracked: "untracked",
      none: "none",
    } as const;
    return t(`calendar.state.${keys[mark]}`);
  };
  const dayName = (day: CalendarDay) => {
    const parts = [formatLabelLong(day.label, locale)];
    if (day.status !== "past") parts.push(t(`calendar.dayStatus.${day.status}`));
    // Upcoming days report nothing. Before tracking, only stored results, such as those of a game
    // turned off later, are read, as only those show on screen.
    const reported =
      day.status === "upcoming"
        ? []
        : gameIds.filter((g) => day.tracked || day.games[g] !== "none");
    const games = reported.map((g) => `${t(`game.${g}`)} ${markText(day.games[g], day.status)}`);
    if (day.all) games.push(t("calendar.allDone"));
    return games.length > 0 ? `${parts.join(", ")}: ${games.join(", ")}` : parts.join(", ");
  };

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-lg border bg-card p-3"
    >
      <div className="flex items-center gap-1">
        <h2 id={titleId} className="grow font-bold">
          {formatMonth(month, locale)}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (month !== current) setAnnouncement(formatMonth(current, locale));
            setFocused(today);
          }}
        >
          {t("calendar.today")}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("calendar.previous")}
          // aria-disabled, not disabled: a disabled button would drop focus to the page.
          aria-disabled={atStart || undefined}
          className="aria-disabled:opacity-40"
          onClick={() => !atStart && goToMonth(addMonths(month, -1))}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("calendar.next")}
          aria-disabled={atEnd || undefined}
          className="aria-disabled:opacity-40"
          onClick={() => !atEnd && goToMonth(addMonths(month, 1))}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {/* A table with role="grid", as in the APG date picker: rows and headers stay native. */}
      <table
        ref={grid}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the WAI-ARIA grid pattern (APG date picker) puts role="grid" on a table; a div instead trips useSemanticElements.
        role="grid"
        aria-labelledby={titleId}
        className="w-full table-fixed border-collapse text-sm"
      >
        <thead>
          <tr>
            {weekdayNames(locale).map((name) => (
              <th key={name} scope="col" className="pb-1 text-xs font-normal text-muted-foreground">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].label}>
              {week.map((day) => (
                <DayCell
                  key={day.label}
                  day={day}
                  name={dayName(day)}
                  focused={day.label === focused}
                  onFocus={() => {
                    const target = clamp(day.label);
                    setFocused(target);
                    // A click beyond the allowed months focuses the nearest allowed day, which
                    // is in the same grid, so focus and the tab stop stay on one cell.
                    if (target !== day.label) {
                      grid.current?.querySelector<HTMLElement>(`[data-label="${target}"]`)?.focus();
                    }
                  }}
                  onKeyDown={(event) => onKeyDown(event, day)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Games played, plus any game whose marks show in this month, such as one turned off. */}
      <Legend
        games={gameIds.filter(
          (g) => prefs[g].plays || weeks.some((w) => w.some((d) => d.games[g] === "done")),
        )}
      />
      {readOnly !== null && (
        <p className="text-sm text-muted-foreground">{t("calendar.readOnly")}</p>
      )}
    </section>
  );
}

function daysIn(month: string) {
  return Number(addDays(`${addMonths(month, 1)}-01`, -1).slice(8));
}

function shiftMonth(label: string, months: number) {
  const target = addMonths(monthOf(label), months);
  const day = Math.min(Number(label.slice(8)), daysIn(target));
  return `${target}-${String(day).padStart(2, "0")}`;
}

// A done dot is a ring thick enough to fill the dot: contrast themes keep borders, not fills.
const dotColors: Record<GameId, string> = {
  genshin: "border-genshin",
  hsr: "border-hsr",
  zzz: "border-zzz",
};
const dot = "size-1.5 rounded-full border-3";

/**
 * A day shows one thing at a time: the all-done fill, or the dots of the games done. Today is a
 * filled circle, and a day still being finalized a dashed ring. Each has a cue besides color;
 * a transparent border, which only contrast themes draw, outlines the fill and the circle there.
 */
function DayCell({
  day,
  name,
  focused,
  onFocus,
  onKeyDown,
}: {
  day: CalendarDay;
  name: string;
  focused: boolean;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}) {
  let date = "border border-transparent forced-colors:border-0";
  if (day.status === "today")
    date = "border border-transparent bg-primary font-semibold text-primary-foreground";
  else if (day.status === "pending") date = "border border-dashed border-muted-foreground";
  const box = day.all
    ? "border-transparent bg-accent font-semibold text-accent-foreground"
    : "border-transparent forced-colors:border-0";
  const muted =
    !day.all && (!day.inMonth || day.status === "upcoming") ? "text-muted-foreground" : "";
  return (
    // In a grid table the cell is a gridcell; it holds focus itself, as the grid has no actions.
    <td
      tabIndex={focused ? 0 : -1}
      aria-label={name}
      aria-current={day.status === "today" ? "date" : undefined}
      data-label={day.label}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className="rounded-lg p-0.5 text-center align-top"
    >
      <div
        aria-hidden
        className={`mx-auto flex h-11 max-w-11 flex-col items-center justify-center gap-0.5 rounded-lg border ${box} ${muted}`}
      >
        <span
          data-today={day.status === "today" || undefined}
          className={`inline-flex size-7 items-center justify-center rounded-full ${date}`}
        >
          {Number(day.label.slice(8))}
        </span>
        {!day.all && (
          <span className="flex h-1.5 gap-0.5">
            {/* Each game keeps its slot, so position, not color alone, says which game it is. */}
            {gameIds.map((g) => (
              <span
                key={g}
                className={day.games[g] === "done" ? `${dot} ${dotColors[g]}` : "size-1.5"}
              />
            ))}
          </span>
        )}
      </div>
    </td>
  );
}

function Legend({ games }: { games: GameId[] }) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
      {games.map((g) => (
        <li key={g} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`${dot} ${dotColors[g]}`} />
          {t(`game.${g}`)}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-3.5 rounded border border-transparent bg-accent" />
        {t("calendar.legend.all")}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-3.5 rounded-full border border-transparent bg-primary" />
        {t("calendar.legend.today")}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-3.5 rounded-full border border-dashed border-muted-foreground"
        />
        {t("calendar.legend.pending")}
      </li>
    </ul>
  );
}
