import { type ReactNode, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ChoreItem, checklist, nextChange } from "@/chores/model";
import { EmptyState } from "@/components/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataSync } from "@/data/store";
import { useAnnouncer } from "@/hooks/useAnnouncer";
import { useNow } from "@/hooks/useNow";
import { formatDuration, formatSeconds } from "@/i18n/duration";
import type { Locale } from "@/i18n/locale";
import { localText } from "@/schedule/model";
import { checkCycleChore, checkDailyChore, gamePrefs, useLocalState } from "@/state/app-state";
import type { GameId } from "@/state/schema";
import {
  formatDateTime,
  formatDateTimeWithWeekday,
  formatLabelDate,
  formatTime,
} from "@/time/format";

type Group = "previous" | "daily" | "weekly" | "periodic";

/** The Calendar's chore checklist for the selected game. */
export function Checklist({ game, onOpenSettings }: { game: GameId; onOpenSettings: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data } = useDataSync();
  const { state, readOnly } = useLocalState();
  // Re-rendered exactly at the next reset or grace end, so a click rarely meets a closed cycle.
  const [boundary, setBoundary] = useState<number | null>(null);
  const seconds = state.settings.countdownSeconds;
  const now = useNow(seconds ? 1000 : 30_000, boundary);
  const list =
    data === null
      ? null
      : checklist(data.games[game], state.chores[game], gamePrefs(state, game), now);
  const next = list === null ? null : nextChange(list, now);
  useEffect(() => setBoundary(next), [next]);
  const { announce, region } = useAnnouncer();
  if (data === null || list === null) return null;
  const ro = readOnly !== null;

  // A game the user does not play has no checklist and no records.
  if (!state.settings.games[game].plays) {
    return (
      <EmptyState
        title={t("chores.notPlayedTitle")}
        body={t("chores.notPlayedBody")}
        action={{ label: t("firstRun.open"), onClick: onOpenSettings }}
      />
    );
  }
  const total = list.daily.items.length + list.weekly.items.length + list.periodic.items.length;
  if (total === 0) {
    return (
      <EmptyState
        title={t("chores.noneTitle")}
        body={t("chores.noneBody", { game: t(`game.${game}`) })}
        action={{ label: t("firstRun.open"), onClick: onOpenSettings }}
      />
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
  // Countdowns read like the Schedule tab's; the exact time is the tooltip.
  const until = (instant: number) => (seconds ? formatSeconds : formatDuration)(t, now, instant);
  const counted = list.periodic.items.filter((i) => i.key !== null);

  return (
    <section aria-labelledby="checklist-heading" className="flex flex-col gap-3">
      <h2 id="checklist-heading" className="sr-only">
        {t("chores.title")}
      </h2>
      {region}

      {list.previous && (
        <GroupBox
          id="previous"
          title={t("chores.previousDay", { date: formatLabelDate(list.previous.label, locale) })}
          caption={t("chores.editableUntil", {
            time: formatTime(list.previous.editableUntil, locale),
          })}
          progress={progress(list.previous.items)}
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
          caption={
            list.daily.resumesAt === null
              ? t("chores.resetsIn", { time: until(list.daily.resetsAt) })
              : null
          }
          captionTitle={t("chores.resetsAt", { when: formatDateTime(list.daily.resetsAt, locale) })}
          progress={list.daily.resumesAt === null ? progress(list.daily.items) : null}
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
          caption={t("chores.resetsIn", { time: until(list.weekly.resetsAt) })}
          captionTitle={t("chores.resetsAt", {
            when: formatDateTimeWithWeekday(list.weekly.resetsAt, locale),
          })}
          progress={progress(list.weekly.items)}
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
          // Chores without a current period are not counted; with none, no count.
          progress={counted.length > 0 ? progress(counted) : null}
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
                  : t("chores.endsIn", { time: until(item.endsAt) })
              }
              endTitle={
                item.endsAt === null
                  ? undefined
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
  caption = null,
  captionTitle,
  progress,
  children,
}: {
  id: Group;
  title: string;
  caption?: string | null;
  captionTitle?: string;
  progress: string | null;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      data-group={id}
      className="rounded-lg border bg-card px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3 pb-2">
        <div>
          <h3 id={headingId} className="font-semibold">
            {title}
          </h3>
          {caption && (
            <p title={captionTitle} className="text-xs text-muted-foreground tabular-nums">
              {caption}
            </p>
          )}
        </div>
        {progress && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
            {progress}
          </span>
        )}
      </div>
      <ul className="flex flex-col divide-y">{children}</ul>
    </section>
  );
}

function Row({
  label,
  checked,
  disabled,
  end,
  endTitle,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  end?: string;
  endTitle?: string;
  onChange: (checked: boolean) => void;
}) {
  const endId = useId();
  return (
    <li className="flex items-center gap-2 py-2">
      {/* Base UI's documented pattern: the label wraps the checkbox, so clicking the text toggles it. */}
      <label
        className={`flex grow items-center gap-2.5 ${disabled ? "text-muted-foreground" : ""}`}
      >
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
        <span
          id={endId}
          title={endTitle}
          className="shrink-0 text-xs text-muted-foreground tabular-nums"
        >
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
