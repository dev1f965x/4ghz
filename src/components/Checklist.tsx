import { type ReactNode, useCallback, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ChoreItem, checklist } from "@/chores/model";
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

/** The Calendar's chore checklist for the selected game (PRD FR25 to FR30, FR37, FR38). */
export function Checklist({ game, onOpenSettings }: { game: GameId; onOpenSettings: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data } = useDataSync();
  const { state, readOnly } = useLocalState();
  const now = useNow(30_000);
  const [announcement, setAnnouncement] = useState("");
  // Clearing first lets the same message be announced again: an unchanged text is not re-read.
  const announce = useCallback((text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);
  if (data === null) return null;
  const gameData = data.games[game];
  const list = checklist(gameData, state.chores[game], REGION, now);
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
  const toggled = (item: ChoreItem, checked: boolean) =>
    announce(t(checked ? "chores.checked" : "chores.unchecked", { chore: name(item) }));
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

  return (
    <section aria-labelledby="checklist-heading" className="flex flex-col gap-3">
      <h2 id="checklist-heading" className="sr-only">
        {t("chores.title")}
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {list.previous && (
        <Group
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
              onChange={(checked) => {
                void checkDailyChore(
                  data,
                  game,
                  list.previous?.label ?? "",
                  item.id,
                  checked,
                  Date.now(),
                );
                toggled(item, checked);
              }}
            />
          ))}
        </Group>
      )}

      {list.daily.items.length > 0 && (
        <Group
          title={t("chores.daily")}
          meta={
            list.daily.resumesAt === null ? `${progress(list.daily.items)} · ${dailyReset}` : null
          }
        >
          {list.daily.resumesAt !== null ? (
            <Note>
              {t("chores.resumes", { when: formatDateTime(list.daily.resumesAt, locale) })}
            </Note>
          ) : (
            list.daily.items.map((item) => (
              <Row
                key={item.id}
                label={name(item)}
                checked={shown(item)}
                disabled={ro}
                onChange={(checked) => {
                  void checkDailyChore(data, game, list.daily.label, item.id, checked, Date.now());
                  toggled(item, checked);
                }}
              />
            ))
          )}
        </Group>
      )}

      {list.weekly.items.length > 0 && (
        <Group
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
              onChange={(checked) => {
                void checkCycleChore(game, list.weekly.key, item.id, checked, Date.now());
                toggled(item, checked);
              }}
            />
          ))}
        </Group>
      )}

      {list.periodic.items.length > 0 && (
        <Group
          title={t("chores.periodic")}
          // Chores without a current period are not counted (PRD FR26).
          meta={progress(list.periodic.items.filter((i) => i.key !== null))}
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
              onChange={(checked) => {
                if (item.key === null) return;
                void checkCycleChore(game, item.key, item.id, checked, Date.now());
                toggled(item, checked);
              }}
            />
          ))}
        </Group>
      )}
    </section>
  );
}

function Group({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string | null;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-lg border bg-card px-3 py-2">
      <div className="flex items-baseline justify-between gap-3 border-b pb-1.5">
        <h3 id={id} className="font-bold">
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
  return (
    <li className="flex items-center gap-2 border-b py-1.5 last:border-b-0">
      {/* Base UI's documented pattern: the label wraps the checkbox, so clicking the text toggles it. */}
      <label className={`flex grow items-center gap-2 ${disabled ? "text-muted-foreground" : ""}`}>
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => onChange(next === true)}
        />
        {label}
      </label>
      {end && <span className="shrink-0 text-sm text-muted-foreground">{end}</span>}
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
