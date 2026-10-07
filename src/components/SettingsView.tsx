import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { choreEnabled, type RegionChange } from "@/chores/model";
import { About } from "@/components/About";
import { GameDot } from "@/components/GameDot";
import { useSyncText } from "@/components/SyncStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { refreshData, useDataSync } from "@/data/store";
import { detectLocale, type Locale } from "@/i18n/locale";
import { logError } from "@/log";
import { localText } from "@/schedule/model";
import {
  gamePrefs,
  previewRegionChange,
  setChoreEnabled,
  setPlays,
  setRegion,
  updateSettings,
  useLocalState,
} from "@/state/app-state";
import { type GameId, gameIds } from "@/state/schema";
import { dataFolderName, openDataFolder } from "@/storage";
import { type Region, regions } from "@/time/clock";
import { formatDateTime, formatLabelDate } from "@/time/format";

type Section = GameId | "language" | "display" | "data" | "about";

/** Settings: each game, the language, the local data, and About. */
/** The selected section is filled, outlined, and bold; contrast themes highlight it instead (index.css). */
const trigger =
  "justify-start px-3 py-1.5 data-active:border-input data-active:bg-muted data-active:font-semibold dark:data-active:bg-muted";

export function SettingsView({ game }: { game: GameId }) {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  // Moving focus to the heading tells screen readers that the screen changed.
  useEffect(() => heading.current?.focus(), []);
  const [section, setSection] = useState<Section>(game);
  return (
    <section aria-labelledby="settings-heading" className="flex flex-col gap-4">
      <h1 id="settings-heading" ref={heading} tabIndex={-1} className="text-lg font-bold">
        {t("shell.settings")}
      </h1>
      <Tabs
        orientation="vertical"
        value={section}
        onValueChange={(value: Section) => setSection(value)}
        className="flex flex-col gap-4 md:flex-row md:gap-8"
      >
        <TabsList
          aria-label={t("settings.sections")}
          className="h-auto shrink-0 items-stretch bg-transparent p-0 md:w-52"
        >
          {gameIds.map((g) => (
            <TabsTrigger key={g} value={g} className={`gap-2 ${trigger}`}>
              <GameDot game={g} />
              {t(`game.${g}`)}
            </TabsTrigger>
          ))}
          {/* Separates the per-game sections from those for the whole app. */}
          <div aria-hidden className="mx-3 my-2 border-t" />
          <TabsTrigger value="language" className={trigger}>
            {t("settings.language")}
          </TabsTrigger>
          <TabsTrigger value="display" className={trigger}>
            {t("settings.display")}
          </TabsTrigger>
          <TabsTrigger value="data" className={trigger}>
            {t("settings.data")}
          </TabsTrigger>
          <TabsTrigger value="about" className={trigger}>
            {t("about.title")}
          </TabsTrigger>
        </TabsList>
        <div className="min-w-0 grow">
          {gameIds.map((g) => (
            <TabsContent key={g} value={g}>
              <GameSettings game={g} />
            </TabsContent>
          ))}
          <TabsContent value="language">
            <LanguageSettings />
          </TabsContent>
          <TabsContent value="display">
            <DisplaySettings />
          </TabsContent>
          <TabsContent value="data">
            <DataSettings />
          </TabsContent>
          <TabsContent value="about">
            <About />
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}

function GameSettings({ game }: { game: GameId }) {
  const { t, i18n } = useTranslation();
  const { data } = useDataSync();
  const { state } = useLocalState();
  const prefs = gamePrefs(state, game);
  const serverId = useId();
  const serverHintId = useId();
  const [change, setChange] = useState<{ region: Region; preview: RegionChange } | null>(null);
  const chores = data?.games[game].chores ?? null;

  const ask = (region: Region) => {
    if (data === null || region === prefs.region) return;
    setChange({ region, preview: previewRegionChange(data, game, region, Date.now()) });
  };
  const regionName = (region: Region) => t(`region.${region}`);

  return (
    <div className="flex flex-col gap-1">
      <h2 className="mb-2 text-base font-bold">{t(`game.${game}`)}</h2>
      <SwitchField
        label={t("settings.playing")}
        hint={t("settings.playingHint")}
        checked={prefs.plays}
        onChange={(plays) => void setPlays(data, game, plays, Date.now())}
      />
      <div className="flex items-center justify-between gap-3 border-b py-2">
        <div className="flex flex-col">
          <span id={serverId}>{t("settings.server")}</span>
          <span id={serverHintId} className="text-sm text-muted-foreground">
            {data === null ? t("settings.serverNeedsData") : t("settings.serverHint")}
          </span>
        </div>
        <Select
          value={prefs.region}
          disabled={data === null}
          onValueChange={(value: Region | null) => value && ask(value)}
          items={regions.map((r) => ({ value: r, label: regionName(r) }))}
        >
          <SelectTrigger
            aria-labelledby={serverId}
            aria-describedby={serverHintId}
            className="min-w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {regionName(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chores === null ? (
        <p className="py-2 text-sm text-muted-foreground">{t("settings.choresNeedData")}</p>
      ) : (
        (["daily", "weekly", "periodic"] as const).map((cycle) => {
          const list = chores.filter((c) => c.cycle === cycle);
          if (list.length === 0) return null;
          return (
            <section key={cycle} aria-label={t(`settings.chores.${cycle}`)} className="mt-3">
              <h3 className="font-bold">{t(`settings.chores.${cycle}`)}</h3>
              {list.map((chore) => (
                <SwitchField
                  key={chore.id}
                  label={localText(chore.name, i18n.language)}
                  checked={choreEnabled(chore, prefs)}
                  onChange={(enabled) =>
                    void setChoreEnabled(data, game, chore.id, enabled, Date.now())
                  }
                />
              ))}
            </section>
          );
        })
      )}

      <AlertDialog open={change !== null} onOpenChange={(open) => !open && setChange(null)}>
        {change && data && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("settings.regionDialog.title", { region: regionName(change.region) })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {regionMessage(
                  change.preview,
                  t,
                  i18n.language as Locale,
                  regionName(change.region),
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("settings.regionDialog.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  // Time may have passed since the dialog opened; a different outcome is shown
                  // again instead of being applied unseen.
                  const now = Date.now();
                  const fresh = previewRegionChange(data, game, change.region, now);
                  if (!samePreview(fresh, change.preview)) {
                    setChange({ region: change.region, preview: fresh });
                    return;
                  }
                  void setRegion(data, game, change.region, now);
                  setChange(null);
                }}
              >
                {t("settings.regionDialog.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

function samePreview(a: RegionChange, b: RegionChange) {
  return (
    a.today.label === b.today.label &&
    a.today.outcome === b.today.outcome &&
    a.resumesAt === b.resumesAt
  );
}

/** The confirmation names what happens to today and when recording resumes. */
function regionMessage(
  preview: RegionChange,
  t: ReturnType<typeof useTranslation>["t"],
  locale: Locale,
  region: string,
) {
  const { today, resumesAt } = preview;
  if (today.outcome === "none") {
    return resumesAt > Date.now()
      ? t("settings.regionDialog.resume", { region, when: formatDateTime(resumesAt, locale) })
      : t("settings.regionDialog.now", { region });
  }
  return t(`settings.regionDialog.${today.outcome}`, {
    date: formatLabelDate(today.label, locale),
    when: formatDateTime(resumesAt, locale),
    region,
  });
}

function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const { state } = useLocalState();
  const headingId = useId();
  const choose = (value: string) => {
    const locale = value === "ko" || value === "en" ? value : undefined;
    void updateSettings({ locale });
    void i18n.changeLanguage(detectLocale(locale, navigator.languages));
  };
  const options: { value: string; label: string; lang?: Locale }[] = [
    { value: "system", label: t("settings.languageSystem") },
    // Each language is named in itself, so it can be found whatever the current language.
    { value: "ko", label: "한국어", lang: "ko" },
    { value: "en", label: "English", lang: "en" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <h2 id={headingId} className="mb-2 text-base font-bold">
        {t("settings.language")}
      </h2>
      <RadioGroup
        aria-labelledby={headingId}
        value={state.settings.locale ?? "system"}
        onValueChange={(value) => choose(String(value))}
      >
        {options.map((o) => (
          <label key={o.value} lang={o.lang} className="flex items-center gap-2 py-1">
            <RadioGroupItem value={o.value} />
            {o.label}
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

function DisplaySettings() {
  const { t } = useTranslation();
  const { state } = useLocalState();
  return (
    <div className="flex flex-col gap-1">
      <h2 className="mb-2 text-base font-bold">{t("settings.display")}</h2>
      <SwitchField
        label={t("settings.countdownSeconds")}
        hint={t("settings.countdownSecondsHint")}
        checked={state.settings.countdownSeconds}
        onChange={(countdownSeconds) => void updateSettings({ countdownSeconds })}
      />
    </div>
  );
}

function DataSettings() {
  const { t } = useTranslation();
  const syncText = useSyncText();
  const [folder, setFolder] = useState<string | null>(null);
  useEffect(() => {
    dataFolderName().then(setFolder, (error: unknown) =>
      // The path is then left out; opening the folder still works.
      logError("Reading the data folder name failed", error),
    );
  }, []);
  return (
    <div className="flex flex-col gap-1">
      <h2 className="mb-2 text-base font-bold">{t("settings.data")}</h2>
      <div className="flex items-center justify-between gap-3 border-b py-2">
        <div className="flex flex-col">
          <span>{t("settings.schedulesAndCodes")}</span>
          <span className="text-sm text-muted-foreground">{syncText}</span>
        </div>
        <Button variant="outline" onClick={() => void refreshData()}>
          {t("sync.refresh")}
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3 border-b py-2">
        <div className="flex min-w-0 flex-col">
          <span>{t("settings.location")}</span>
          {folder && (
            <span className="font-mono text-sm break-all text-muted-foreground">
              %LOCALAPPDATA%\{folder}
            </span>
          )}
        </div>
        <OpenFolderButton />
      </div>
      <p className="py-2 text-sm text-muted-foreground">{t("settings.uninstall")}</p>
    </div>
  );
}

/** Opens the data folder; also offered on the read-only banner. */
export function OpenFolderButton() {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        onClick={() =>
          openDataFolder().then(
            () => setFailed(false),
            (error: unknown) => {
              logError("Opening the data folder failed", error);
              setFailed(true);
            },
          )
        }
      >
        {t("settings.openFolder")}
      </Button>
      {/* Next to the button wherever it appears, the read-only banner included. */}
      {failed && (
        <span role="alert" className="text-sm">
          {t("settings.openFolderFailed")}
        </span>
      )}
    </span>
  );
}

/** A labeled switch with an optional hint below it. */
function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const hintId = useId();
  return (
    <div className="border-b py-2">
      <label className="flex items-center justify-between gap-3">
        {label}
        <Switch
          checked={checked}
          aria-describedby={hint ? hintId : undefined}
          onCheckedChange={(next) => onChange(next)}
        />
      </label>
      {/* Outside the label, so it describes the switch instead of lengthening its name. */}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
