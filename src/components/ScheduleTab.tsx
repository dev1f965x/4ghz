import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import type { Locale } from "@/i18n/locale";
import { localText, type ScheduleRow, scheduleRows } from "@/schedule/model";
import type { GameId } from "@/state/schema";
import type { Region } from "@/time/clock";
import { formatDateTime, formatRange } from "@/time/format";

// The server is chosen in Settings (GHZ-20); until then every game uses the default, Asia.
const region: Region = "asia";

/** The Schedule tab: ongoing and upcoming entries with live countdowns (PRD FR15 to FR18). */
export function ScheduleTab({ game }: { game: GameId }) {
  const { t, i18n } = useTranslation();
  const { data } = useDataSync();
  const now = useNow(30_000);
  if (data === null) return null;
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
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-bold">{title}</h2>
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
  if (!ongoing) countdown = t("schedule.startsIn", { time: duration(row.start - now, t) });
  else if (row.end !== null)
    countdown = t("schedule.timeLeft", { time: duration(row.end - now, t) });

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <span className="shrink-0 rounded-md border px-1.5 text-xs text-muted-foreground">
        {t(`schedule.type.${row.type}`)}
      </span>
      <div className="grow">
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
      {countdown && <span className="shrink-0 text-sm">{countdown}</span>}
      {row.url && (
        <Button
          variant="outline"
          size="sm"
          // Names the entry too, since every row has the same button text.
          aria-label={`${t("schedule.openAnnouncement")}: ${title}`}
          onClick={() => void openUrl(row.url as string)}
        >
          {t("schedule.openAnnouncement")}
          <span aria-hidden>↗</span>
        </Button>
      )}
    </li>
  );
}

/** "3일 4시간", "4시간 5분", or "5분": minutes round up, so an entry never shows 0 while it runs. */
function duration(ms: number, t: ReturnType<typeof useTranslation>["t"]) {
  const total = Math.max(1, Math.ceil(ms / 60_000));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return t("duration.days", { d, h });
  if (h > 0) return t("duration.hours", { h, m });
  return t("duration.minutes", { m });
}
