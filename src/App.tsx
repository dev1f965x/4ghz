import { ArrowLeftIcon, SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banners } from "@/components/Banners";
import { Checklist } from "@/components/Checklist";
import { CodesTab } from "@/components/CodesTab";
import { DataState } from "@/components/DataState";
import { GameSelect } from "@/components/GameSelect";
import { Mark } from "@/components/Mark";
import { MonthCalendar } from "@/components/MonthCalendar";
import { RedemptionLink } from "@/components/RedemptionLink";
import { ScheduleTab } from "@/components/ScheduleTab";
import { SettingsView } from "@/components/SettingsView";
import { SyncStatus } from "@/components/SyncStatus";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WindowControls } from "@/components/WindowControls";
import { refreshData, useDataSync } from "@/data/store";
import { useNow } from "@/hooks/useNow";
import { advanceAllChores, updateSettings, useLocalState } from "@/state/app-state";
import { type TabId, tabIds } from "@/state/schema";

const FIRST_DATA_MARK = "first-data-render";

export default function App() {
  const { t } = useTranslation();
  const { state } = useLocalState();
  const { lastGame: game, lastTab: tab } = state.settings;
  const [view, setView] = useState<"main" | "settings">("main");
  const settingsButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.game = game;
  }, [game]);

  // Resets and missed days apply on start, every 30 seconds, and when the window regains focus
  // or becomes visible. A clock change or a resume that triggers neither is picked up
  // by the next 30-second tick.
  const { data } = useDataSync();
  const now = useNow(30_000);
  useEffect(() => {
    if (data !== null) advanceAllChores(data, now);
  }, [data, now]);
  // Marks when data is first on screen; the smoke test reads it to measure the startup target:
  // cached data within 1 second of launch.
  useEffect(() => {
    if (data !== null && performance.getEntriesByName(FIRST_DATA_MARK).length === 0) {
      performance.mark(FIRST_DATA_MARK);
    }
  }, [data]);
  const openSettings = useCallback(() => setView("settings"), []);
  const closeSettings = useCallback(() => {
    returnFocus.current = true;
    setView("main");
  }, []);

  // Back and Esc return focus to the Settings button, where the user left the main screen.
  useEffect(() => {
    if (view === "main" && returnFocus.current) {
      returnFocus.current = false;
      settingsButton.current?.focus();
    }
  }, [view]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F5") {
        // Refreshes the data instead of reloading the window, which would lose unsaved state.
        event.preventDefault();
        void refreshData();
      } else if (
        event.key === "," &&
        event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        openSettings();
      } else if (event.key === "Escape" && view === "settings" && !event.defaultPrevented) {
        // Base UI popups handle their own Escape first and mark the event as handled.
        closeSettings();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, openSettings, closeSettings]);

  const inSettings = view === "settings";
  return (
    // The header is the title bar, so it stays put and only the content below it scrolls.
    <div className="flex h-svh flex-col overflow-hidden">
      {/* data-tauri-drag-region on the bar and its empty areas lets the window be dragged and
          double-clicked to maximize; the controls inside stay clickable. */}
      <header data-tauri-drag-region className="flex shrink-0 border-b bg-card">
        <div
          data-tauri-drag-region
          className="flex min-h-12 grow flex-wrap items-center gap-x-3 gap-y-2 py-2 pl-4"
        >
          <Mark />
          {inSettings ? (
            <Button variant="outline" size="sm" onClick={closeSettings}>
              <ArrowLeftIcon aria-hidden data-icon="inline-start" />
              {t("shell.back")}
            </Button>
          ) : (
            <GameSelect game={game} onChange={(g) => void updateSettings({ lastGame: g })} />
          )}
          <SyncStatus />
          <Button
            ref={settingsButton}
            variant="ghost"
            size="sm"
            aria-pressed={inSettings}
            aria-keyshortcuts="Control+,"
            className="aria-pressed:bg-accent aria-pressed:text-accent-foreground"
            onClick={inSettings ? closeSettings : openSettings}
          >
            <SettingsIcon aria-hidden data-icon="inline-start" />
            {/* Icon only in narrow windows; the text stays as the accessible name. */}
            <span className="max-md:sr-only">{t("shell.settings")}</span>
          </Button>
        </div>
        <WindowControls />
      </header>
      <div data-scroll-root className="flex grow flex-col gap-3 overflow-y-auto p-4">
        <Banners onOpenSettings={inSettings ? undefined : openSettings} />
        <main className="flex grow flex-col">
          {inSettings ? (
            <SettingsView game={game} />
          ) : (
            <Tabs
              value={tab}
              onValueChange={(value: TabId) => {
                if (tabIds.includes(value)) void updateSettings({ lastTab: value });
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <TabsList variant="line">
                  {tabIds.map((id) => (
                    <TabsTrigger key={id} value={id}>
                      {t(`tab.${id}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {/* As in the wireframes, the Codes tab offers the game's redemption page here. */}
                {tab === "codes" && <RedemptionLink game={game} />}
              </div>
              {tabIds.map((id) => (
                <TabsContent key={id} value={id}>
                  {id === "calendar" ? (
                    // Side by side when wide, the grid below the checklist at 720 px. The grid
                    // needs no data file, so it stays when the checklist cannot load.
                    <div className="grid gap-4 lg:grid-cols-2">
                      <DataState>
                        <Checklist game={game} onOpenSettings={openSettings} />
                      </DataState>
                      <MonthCalendar />
                    </div>
                  ) : (
                    <DataState>
                      {id === "schedule" && <ScheduleTab game={game} />}
                      {id === "codes" && <CodesTab game={game} />}
                    </DataState>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}
