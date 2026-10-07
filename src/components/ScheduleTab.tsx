import { ArrowUpRightIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { hoverCard } from "@/components/card";
import { EmptyState } from "@/components/EmptyState";
import { OpenFailed, useOpenUrl } from "@/components/ExternalLinkButton";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import { formatDuration, formatSeconds } from "@/i18n/duration";
import type { Locale } from "@/i18n/locale";
import { localText, type ScheduleRow, scheduleRows } from "@/schedule/model";
import { useLocalState } from "@/state/app-state";
import type { GameId } from "@/state/schema";
import { formatDateTime, formatRange } from "@/time/format";

/** The Schedule tab: ongoing and upcoming entries with live countdowns. */
export function ScheduleTab({ game }: { game: GameId }) {
  const { t, i18n } = useTranslation();
  const { data } = useDataSync();
  const { state } = useLocalState();
  const seconds = state.settings.countdownSeconds;
  const now = useNow(seconds ? 1000 : 30_000);
  if (data === null) return null;
  const { region } = state.settings.games[game];
  const { ongoing, upcoming } = scheduleRows(data.games[game], region, now);

  if (ongoing.length === 0 && upcoming.length === 0) {
    const date = formatDateTime(Date.parse(data.updatedAt), i18n.language as Locale);
    return <EmptyState title={t("schedule.emptyTitle")} body={t("schedule.emptyBody", { date })} />;
  }
  return (
    <div className="flex flex-col gap-4">
      {ongoing.length > 0 && (
        <Section title={t("schedule.ongoing")} rows={ongoing} now={now} ongoing seconds={seconds} />
      )}
      {upcoming.length > 0 && (
        <Section
          title={t("schedule.upcoming")}
          rows={upcoming}
          now={now}
          ongoing={false}
          seconds={seconds}
        />
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  now,
  ongoing,
  seconds,
}: {
  title: string;
  rows: ScheduleRow[];
  now: number;
  ongoing: boolean;
  seconds: boolean;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="font-bold">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <Row key={row.id} row={row} now={now} ongoing={ongoing} seconds={seconds} />
        ))}
      </ul>
    </section>
  );
}

function Row({
  row,
  now,
  ongoing,
  seconds,
}: {
  row: ScheduleRow;
  now: number;
  ongoing: boolean;
  seconds: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { open, failed } = useOpenUrl();
  const ids = { title: useId(), meta: useId(), countdown: useId(), action: useId() };
  const locale = i18n.language as Locale;
  const title = localText(row.title, i18n.language);
  const range =
    row.end === null ? formatDateTime(row.start, locale) : formatRange(row.start, row.end, locale);

  const format = seconds ? formatSeconds : formatDuration;
  let countdown: { label: string; time: string } | null = null;
  if (!ongoing) countdown = { label: t("schedule.startsIn"), time: format(t, now, row.start) };
  else if (row.end !== null) {
    countdown = { label: t("schedule.timeLeft"), time: format(t, now, row.end) };
  }

  const { url } = row;
  const content = (
    <>
      <span className="block min-w-48 flex-1">
        <span id={ids.title} className="block font-semibold">
          {title}
        </span>
        <span id={ids.meta} className="block text-sm text-muted-foreground">
          {t(`schedule.type.${row.type}`)} · {range}
          {row.estimated && (
            <span className="ml-2 rounded-sm border border-dashed px-1 text-xs">
              {t("schedule.estimated")}
            </span>
          )}
        </span>
      </span>
      <span id={ids.countdown} className="ml-auto block min-w-40 shrink-0 text-right">
        {countdown && (
          <>
            <span className="block text-xs text-muted-foreground">{countdown.label}</span>
            <span className="block font-semibold tabular-nums">{countdown.time}</span>
          </>
        )}
      </span>
      {/* Space kept on every card so times line up; the arrow marks cards that open. */}
      <span aria-hidden className="w-4 shrink-0 text-muted-foreground">
        {url && (
          <ArrowUpRightIcon className="size-4 opacity-50 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        )}
      </span>
    </>
  );
  // At large Windows text sizes the countdown wraps below the title instead of squeezing it.
  const layout = "flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left";
  if (!url) {
    return <li className={`${hoverCard} ${layout}`}>{content}</li>;
  }
  return (
    <li className="flex flex-col items-start gap-1">
      {/* The whole card opens the announcement. Its name is the title and the action; the dates
          and the live countdown are its description, so the name does not change every second. */}
      <button
        type="button"
        aria-labelledby={`${ids.title} ${ids.action}`}
        aria-describedby={`${ids.meta} ${ids.countdown}`}
        className={`group ${hoverCard} ${layout}`}
        onClick={() => open(url)}
      >
        {content}
        <span id={ids.action} className="sr-only">
          {t("schedule.openAnnouncement")}
        </span>
      </button>
      {failed && <OpenFailed />}
    </li>
  );
}
