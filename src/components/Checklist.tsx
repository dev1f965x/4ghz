import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ChoreItem, checklist, nextChange } from "@/chores/model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import type { Locale } from "@/i18n/locale";
import { localText } from "@/schedule/model";
import { checkCycleChore, checkDailyChore, REGION, useLocalState } from "@/state/app-state";
import type { GameId } from "@/state/schema";
import {
  formatDateTime,
  formatDateTimeWithWeekday,
  formatLabelDate,
  formatTime,
  isTomorrow,
} from "@/time/format";

type Group = "previous" | "daily" | "weekly" | "periodic";

/** The Calendar's chore checklist for the selected game (PRD FR25 to FR30, FR37, FR38). */
export function Checklist({ game, onOpenSettings }: { game: GameId; onOpenSettings: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data } = useDataSync();
  const { state, readOnly } = useLocalState();
  // Re-rendered exactly at the next reset or grace end, so a click rarely meets a closed cycle.
  const [boundary, setBoundary] = useState<number | null>(null);
  const now = useNow(30_000, boundary);
  const list = data === null ? null : checklist(data.games[game], state.chores[game], REGION, now);
  const next = list === null ? null : nextChange(list, now);
  useEffect(() => setBoundary(next), [next]);
  const [announcement, setAnnouncement] = useState("");
  // Clearing first lets the same message be announced again: an unchanged text is not re-read.
  const announce = useCallback((text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);
  if (data === null || list === null) return null;
  const ro = readOnly !== null;

  const total = list.daily.items.length + list.weekly.items.length + list.periodic.items.length;
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-input bg-card px-4 py-8 text-center">
        <h2 className="font-bold">{t("chores.noneTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("chores.noneBody", { game: t(`game.${game}`) })}
        </p>
        <Button variant="outline" onClick={onOpenSettings}>
          {t("firstRun.open")}
        </Button>
      </div>
    );
  }

  const name = (item: ChoreItem) => localText(item.name, i18n.language);
  const change = (group: Group, item: ChoreItem, checked: boolean, key: string | null) => {
    const at = Date.now();
    let accepted = false;
    if (group === "previous" && list.previous) {
      accepted = checkDailyChore(data, game, list.previous.label, item.id, checked, at);
    } else if (group === "daily") {
      accepted = checkDailyChore(data, game, list.daily.label, item.id, checked, at);
    } else if (key !== null) {
      accepted = checkCycleChore(data, game, key, item.id, checked, at);
    }
    if (accepted) {
      announce(t(checked ? "chores.checked" : "chores.unchecked", { chore: name(item) }));
    } else {
      // The list was drawn before a reset; the next render shows the cycle closed.
      announce(t("chores.closed", { chore: name(item) }));
    }
  };
  // Read-only: nothing stored can be shown, so every box is unchecked and disabled (wireframe).
  const shown = (item: ChoreItem) => !ro && item.checked;
  const progress = (items: ChoreItem[]) =>
    t("chores.progress", {
      done: ro ? "—" : items.filter((i) => i.checked).length,
      total: items.length,
    });
  const dailyReset = isTomorrow(list.daily.resetsAt, now)
    ? t("chores.resetsTomorrow", { time: formatTime(list.daily.resetsAt, locale) })
    : t("chores.resetsAt", { when: formatDateTime(list.daily.resetsAt, locale) });
  const counted = list.periodic.items.filter((i) => i.key !== null);

  return (
    <section aria-labelledby="checklist-heading" className="flex flex-col gap-3">
      <h2 id="checklist-heading" className="sr-only">
        {t("chores.title")}
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {list.previous && (
        <GroupBox
          id="previous"
          title={t("chores.previousDay", { date: formatLabelDate(list.previous.label, locale) })}
          meta={t("chores.editableUntil", {
            time: formatTime(list.previous.editableUntil, locale),
          })}
        >
          {list.previous.items.map((item) => (
            <Row
              key={item.id}
              label={name(item)}
              checked={shown(item)}
              disabled={ro}
              onChange={(checked) => change("previous", item, checked, null)}
            />
          ))}
        </GroupBox>
      )}

      {list.daily.items.length > 0 && (
        <GroupBox
          id="daily"
          title={t("chores.daily")}
          meta={
            list.daily.resumesAt === null ? `${progress(list.daily.items)} · ${dailyReset}` : null
          }
        >
          {list.daily.resumesAt !== null ? (
            <li>
              <Note>
                {t("chores.resumes", { when: formatDateTime(list.daily.resumesAt, locale) })}
              </Note>
            </li>
          ) : (
            list.daily.items.map((item) => (
              <Row
                key={item.id}
                label={name(item)}
                checked={shown(item)}
                disabled={ro}
                onChange={(checked) => change("daily", item, checked, null)}
              />
            ))
          )}
        </GroupBox>
      )}

      {list.weekly.items.length > 0 && (
        <GroupBox
          id="weekly"
          title={t("chores.weekly")}
          meta={`${progress(list.weekly.items)} · ${t("chores.resetsAt", {
            when: formatDateTimeWithWeekday(list.weekly.resetsAt, locale),
          })}`}
        >
          {list.weekly.items.map((item) => (
            <Row
              key={item.id}
              label={name(item)}
              checked={shown(item)}
              disabled={ro}
              onChange={(checked) => change("weekly", item, checked, list.weekly.key)}
            />
          ))}
        </GroupBox>
      )}

      {list.periodic.items.length > 0 && (
        <GroupBox
          id="periodic"
          title={t("chores.periodic")}
          // Chores without a current period are not counted (PRD FR26); with none, no count.
          meta={counted.length > 0 ? progress(counted) : null}
        >
          {list.periodic.items.map((item) => (
            <Row
              key={item.id}
              label={name(item)}
              checked={shown(item)}
              disabled={ro || item.key === null}
              end={
                item.endsAt === null
                  ? t("chores.noPeriod")
                  : t("chores.endsAt", { when: formatDateTime(item.endsAt, locale) })
              }
              onChange={(checked) => change("periodic", item, checked, item.key)}
            />
          ))}
        </GroupBox>
      )}
    </section>
  );
}

function GroupBox({
  id,
  title,
  meta,
  children,
}: {
  id: Group;
  title: string;
  meta: string | null;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      data-group={id}
      className="rounded-lg border bg-card px-3 py-2"
    >
      <div className="flex items-baseline justify-between gap-3 border-b pb-1.5">
        <h3 id={headingId} className="font-bold">
          {title}
        </h3>
        {meta && <span className="text-sm text-muted-foreground tabular-nums">{meta}</span>}
      </div>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

function Row({
  label,
  checked,
  disabled,
  end,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  end?: string;
  onChange: (checked: boolean) => void;
}) {
  const endId = useId();
  return (
    <li className="flex items-center gap-2 border-b py-1.5 last:border-b-0">
      {/* Base UI's documented pattern: the label wraps the checkbox, so clicking the text toggles it. */}
      <label className={`flex grow items-center gap-2 ${disabled ? "text-muted-foreground" : ""}`}>
        <Checkbox
          checked={checked}
          disabled={disabled}
          // The end time, or why the box is disabled, is read with the chore.
          aria-describedby={end ? endId : undefined}
          onCheckedChange={(next) => onChange(next === true)}
        />
        {label}
      </label>
      {end && (
        <span id={endId} className="shrink-0 text-sm text-muted-foreground">
          {end}
        </span>
      )}
    </li>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-input bg-card px-3 py-2 text-sm">
      {children}
    </p>
  );
}
