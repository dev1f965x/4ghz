import { ChevronLeftIcon, ChevronRightIcon, HourglassIcon } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addMonths,
  type CalendarDay,
  calendarMonth,
  firstMonth,
  type GameMark as Mark,
  monthOf,
} from "@/calendar/model";
import { GameMark } from "@/components/GameMark";
import { Button } from "@/components/ui/button";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import type { Locale } from "@/i18n/locale";
import { REGION, useLocalState } from "@/state/app-state";
import { gameIds } from "@/state/schema";
import { addDays, gameDayLabel, gameDayStart } from "@/time/clock";
import { GRACE_MS } from "@/time/days";
import { formatLabelLong, formatMonth, weekdayNames } from "@/time/format";

/**
 * The month grid of completed days (PRD FR31 to FR36), a WAI-ARIA grid with a roving tabindex:
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
  const today = gameDayLabel(now, REGION);
  // The grid changes when a day starts and when the previous day's grace period ends.
  const graceEnd = gameDayStart(today, REGION) + GRACE_MS;
  const next = graceEnd > now ? graceEnd : gameDayStart(addDays(today, 1), REGION);
  useEffect(() => setBoundary(next), [next]);

  const current = monthOf(today);
  const earliest = firstMonth(state.chores, current);
  const [focused, setFocused] = useState(today);
  const month = monthOf(focused);
  const weeks = calendarMonth(
    { chores: state.chores, games: data?.games ?? null, region: REGION, now },
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
  const last = addDays(`${addMonths(current, 1)}-01`, -1);
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
  const atEnd = month >= current;

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
    const games =
      day.status === "upcoming"
        ? []
        : gameIds.map((g) => `${t(`game.${g}`)} ${markText(day.games[g], day.status)}`);
    if (day.all) games.push(t("calendar.allDone"));
    return games.length > 0 ? `${parts.join(", ")}: ${games.join(", ")}` : parts.join(", ");
  };

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("calendar.previous")}
          // aria-disabled, not disabled: a disabled button would drop focus to the page.
          aria-disabled={atStart || undefined}
          className="aria-disabled:opacity-50"
          onClick={() => !atStart && goToMonth(addMonths(month, -1))}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <h2 id={titleId} className="min-w-32 text-center font-bold">
          {formatMonth(month, locale)}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("calendar.next")}
          aria-disabled={atEnd || undefined}
          className="aria-disabled:opacity-50"
          onClick={() => !atEnd && goToMonth(addMonths(month, 1))}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
        <span className="grow" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (month !== current) setAnnouncement(formatMonth(current, locale));
            setFocused(today);
          }}
        >
          {t("calendar.today")}
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
        className="w-full table-fixed border-separate border-spacing-1 text-sm"
      >
        <thead>
          <tr>
            {weekdayNames(locale).map((name) => (
              <th key={name} scope="col" className="py-1 text-xs font-normal text-muted-foreground">
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
                  readOnly={readOnly !== null}
                  focused={day.label === focused}
                  allLabel={t("calendar.all")}
                  onFocus={() => setFocused(clamp(day.label))}
                  onKeyDown={(event) => onKeyDown(event, day)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <Legend />
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

// Each state has a cue besides color: the highlight a double border and "All", pending a dotted
// border and an hourglass, upcoming a dashed border, today an inverted date. Days of the next
// or previous month are plain and muted, as in most calendars.
function cellStyle(day: CalendarDay) {
  if (!day.inMonth) return "border-transparent text-muted-foreground";
  if (day.all) return "border-4 border-double border-foreground bg-muted";
  if (day.status === "pending") return "border-2 border-dotted border-foreground bg-card";
  if (day.status === "upcoming") return "border-dashed border-input text-muted-foreground";
  return "border-input bg-card";
}

function DayCell({
  day,
  name,
  readOnly,
  focused,
  allLabel,
  onFocus,
  onKeyDown,
}: {
  day: CalendarDay;
  name: string;
  readOnly: boolean;
  focused: boolean;
  allLabel: string;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}) {
  const done = gameIds.filter((g) => day.games[g] === "done");
  const noRecord =
    day.inMonth &&
    (day.status === "past" || (readOnly && day.status !== "upcoming")) &&
    done.length === 0 &&
    gameIds.every((g) => day.games[g] === "none");
  return (
    // In a grid table the cell is a gridcell; it holds focus itself, as the grid has no actions.
    <td
      tabIndex={focused ? 0 : -1}
      aria-label={name}
      aria-current={day.status === "today" ? "date" : undefined}
      data-label={day.label}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={`relative h-14 rounded-md border p-1 align-top ${cellStyle(day)}`}
    >
      <span
        aria-hidden
        className={`inline-flex min-w-5 justify-center rounded-full px-1 ${
          day.status === "today" ? "bg-foreground font-bold text-background" : ""
        }`}
      >
        {Number(day.label.slice(8))}
      </span>
      <span
        aria-hidden
        className="absolute top-1 right-1 flex items-center gap-0.5 text-xs font-bold"
      >
        {day.status === "pending" && <HourglassIcon className="size-3.5" />}
        {day.all && allLabel}
      </span>
      <span aria-hidden className="mt-1 flex flex-wrap gap-0.5">
        {done.map((g) => (
          <GameMark key={g} game={g} />
        ))}
        {noRecord && <span className="text-muted-foreground">—</span>}
      </span>
    </td>
  );
}

function Legend() {
  const { t } = useTranslation();
  const sample = "inline-flex size-5 items-center justify-center rounded-sm border";
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {gameIds.map((g) => (
        <li key={g} className="inline-flex items-center gap-1.5">
          <GameMark game={g} />
          {t("calendar.legend.done", { game: t(`game.${g}`) })}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className={`${sample} border-4 border-double border-foreground bg-muted`}
        />
        {t("calendar.legend.all")}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-4 rounded-full bg-foreground" />
        {t("calendar.legend.today")}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className={`${sample} border-2 border-dotted border-foreground`}>
          <HourglassIcon className="size-3" />
        </span>
        {t("calendar.legend.pending")}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="w-5 text-center">
          —
        </span>
        {t("calendar.legend.noRecord")}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className={`${sample} border-dashed border-input`} />
        {t("calendar.legend.upcoming")}
      </li>
    </ul>
  );
}
