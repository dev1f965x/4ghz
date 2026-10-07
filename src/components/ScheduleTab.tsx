import { useId } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { ExternalLinkButton } from "@/components/ExternalLinkButton";
import { Button } from "@/components/ui/button";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import { formatClock, formatDuration } from "@/i18n/duration";
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
      <ul className="divide-y rounded-lg border bg-card">
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
  const locale = i18n.language as Locale;
  const title = localText(row.title, i18n.language);
  const range =
    row.end === null ? formatDateTime(row.start, locale) : formatRange(row.start, row.end, locale);

  const format = seconds ? formatClock : formatDuration;
  let countdown: { label: string; time: string } | null = null;
  if (!ongoing) countdown = { label: t("schedule.startsIn"), time: format(t, now, row.start) };
  else if (row.end !== null) {
    countdown = { label: t("schedule.timeLeft"), time: format(t, now, row.end) };
  }

  const { url } = row;
  const label = t("schedule.openAnnouncement");

  // The countdown and button keep fixed widths so times line up across rows. At large Windows
  // text sizes they wrap below the title instead of squeezing it.
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
      <div className="min-w-48 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">
          {t(`schedule.type.${row.type}`)} · {range}
          {row.estimated && (
            <span className="ml-2 rounded-sm border border-dashed px-1 text-xs">
              {t("schedule.estimated")}
            </span>
          )}
        </p>
      </div>
      <p className="ml-auto min-w-32 shrink-0 text-right">
        {countdown && (
          <>
            <span className="block text-xs text-muted-foreground">{countdown.label}</span>
            <span className="block font-semibold tabular-nums">{countdown.time}</span>
          </>
        )}
      </p>
      {url ? (
        // Names the entry too, since every row has the same button text.
        <ExternalLinkButton url={url} variant="ghost" size="sm" aria-label={`${label}: ${title}`}>
          {label}
          <span aria-hidden>↗</span>
        </ExternalLinkButton>
      ) : (
        // Rows without a link keep an invisible button, so the columns line up.
        <Button variant="ghost" size="sm" className="invisible" aria-hidden tabIndex={-1}>
          {label}
          <span aria-hidden>↗</span>
        </Button>
      )}
    </li>
  );
}
