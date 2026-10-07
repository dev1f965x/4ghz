import { openUrl } from "@tauri-apps/plugin-opener";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/i18n/duration";
import type { Locale } from "@/i18n/locale";
import { logError } from "@/log";
import { localText, type ScheduleRow, scheduleRows } from "@/schedule/model";
import { useLocalState } from "@/state/app-state";
import type { GameId } from "@/state/schema";
import { formatDateTime, formatRange } from "@/time/format";

/** The Schedule tab: ongoing and upcoming entries with live countdowns (PRD FR15 to FR18). */
export function ScheduleTab({ game }: { game: GameId }) {
  const { t, i18n } = useTranslation();
  const { data } = useDataSync();
  const { state } = useLocalState();
  const now = useNow(30_000);
  if (data === null) return null;
  const { region } = state.settings.games[game];
  const { ongoing, upcoming } = scheduleRows(data.games[game], region, now);

  if (ongoing.length === 0 && upcoming.length === 0) {
    const date = formatDateTime(Date.parse(data.updatedAt), i18n.language as Locale);
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-input bg-card px-4 py-8 text-center">
        <h2 className="font-bold">{t("schedule.emptyTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("schedule.emptyBody", { date })}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {ongoing.length > 0 && (
        <Section title={t("schedule.ongoing")} rows={ongoing} now={now} ongoing />
      )}
      {upcoming.length > 0 && (
        <Section title={t("schedule.upcoming")} rows={upcoming} now={now} ongoing={false} />
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  now,
  ongoing,
}: {
  title: string;
  rows: ScheduleRow[];
  now: number;
  ongoing: boolean;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="font-bold">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <Row key={row.id} row={row} now={now} ongoing={ongoing} />
        ))}
      </ul>
    </section>
  );
}

function Row({ row, now, ongoing }: { row: ScheduleRow; now: number; ongoing: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const title = localText(row.title, i18n.language);
  const range =
    row.end === null ? formatDateTime(row.start, locale) : formatRange(row.start, row.end, locale);

  let countdown: string | null = null;
  if (!ongoing) countdown = t("schedule.startsIn", { time: formatDuration(t, now, row.start) });
  else if (row.end !== null)
    countdown = t("schedule.timeLeft", { time: formatDuration(t, now, row.end) });

  const { url } = row;
  const open = () => {
    if (!url) return;
    openUrl(url).catch((error: unknown) => {
      // The capability or a missing default browser refused it; nothing else to show yet.
      logError(`Opening ${url} failed`, error);
    });
  };

  // Fixed widths for the type, countdown, and button columns keep titles aligned across rows. At
  // large Windows text sizes the countdown and button wrap below the title instead of squeezing it.
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-2">
      <span className="min-w-16 shrink-0 rounded-md border px-1.5 text-center text-xs text-muted-foreground">
        {t(`schedule.type.${row.type}`)}
      </span>
      <div className="min-w-48 flex-1">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted-foreground">
          {range}
          {row.estimated && (
            <span className="ml-2 rounded-md border border-dashed px-1 text-xs">
              {t("schedule.estimated")}
            </span>
          )}
        </p>
      </div>
      <span className="ml-auto min-w-32 shrink-0 text-right text-sm tabular-nums">{countdown}</span>
      <Button
        variant="outline"
        size="sm"
        // Rows without a link keep an invisible button, so the columns line up.
        className={url ? undefined : "invisible"}
        aria-hidden={url ? undefined : true}
        tabIndex={url ? undefined : -1}
        // Names the entry too, since every row has the same button text.
        aria-label={`${t("schedule.openAnnouncement")}: ${title}`}
        onClick={open}
      >
        {t("schedule.openAnnouncement")}
        <span aria-hidden>↗</span>
      </Button>
    </li>
  );
}
