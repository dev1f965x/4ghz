import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useState } from "react";
import "./design/base.css";
import "./design/scrollbar.css";
import "./App.css";
import type { UsedCodesMemory } from "./codes/usedCodes";
import { useUsedCodes } from "./codes/useUsedCodes";
import { BrandMark } from "./components/BrandMark";
import { CodeList } from "./components/CodeList";
import { DailiesTab } from "./components/DailiesTab";
import { EventList } from "./components/EventList";
import { GameFilterMenu } from "./components/GameFilterMenu";
import { Notice } from "./components/Notice";
import { RefreshButton } from "./components/RefreshButton";
import { panelId, TabBar, tabId } from "./components/TabBar";
import { UpdateBanner } from "./components/UpdateBanner";
import { useMinimumDuration } from "./components/useMinimumDuration";
import { WindowControls } from "./components/WindowControls";
import type { DailyRecordsMemory } from "./dailies/dailyRecords";
import { useDailyRecords } from "./dailies/useDailyRecords";
import type { GameEvent } from "./domain/event";
import { type GameFilter, matchesFilter } from "./domain/filter";
import { FETCH_LABELS, formatFetchedAt } from "./domain/labels";
import type { SyncState } from "./feed/sync";
import type { FilterMemory } from "./filter/filterMemory";
import { useGameFilter } from "./filter/useGameFilter";
import { TABS, type Tab } from "./navigation/tabs";
import { Spotlight } from "./onboarding/Spotlight";
import type { TourMemory } from "./onboarding/useTour";
import { useTour } from "./onboarding/useTour";
import { useNow } from "./shell/clock";
import type { UpdateState } from "./update/useUpdate";

/** Long enough to read the refreshing label before the fetch time replaces it. */
const REFRESH_FEEDBACK_MS = 600;

export interface AppProps {
  state: SyncState;
  onRefresh: () => void;
  tourMemory: TourMemory;
  usedCodesMemory: UsedCodesMemory;
  dailiesMemory: DailyRecordsMemory;
  filterMemory: FilterMemory;
  update?: UpdateState;
  onInstallUpdate?: () => void;
  /** Fixed by tests; the window reads a ticking clock. */
  now?: Date;
}

/**
 * The window, in three bands: one bar that is both title bar and header — the app's
 * name, its controls, and the window's own — then the tabs, then the content,
 * which is the only part that scrolls.
 */
export default function App({
  state,
  onRefresh,
  tourMemory,
  usedCodesMemory,
  dailiesMemory,
  filterMemory,
  update = { status: "current" },
  onInstallUpdate = () => {},
  now,
}: AppProps) {
  const clock = useNow();
  const current = now ?? clock;
  const refreshing = useMinimumDuration(
    state.status === "ready" && state.refreshing,
    REFRESH_FEEDBACK_MS,
  );
  const hasEvents = state.status === "ready" && state.cached.feed.events.length > 0;
  const tour = useTour(tourMemory, hasEvents);
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const usedCodes = useUsedCodes(usedCodesMemory);
  const dailies = useDailyRecords(dailiesMemory);
  const { filter, choose } = useGameFilter(filterMemory);

  return (
    <div className="app" data-game={filter === "all" ? undefined : filter}>
      <header className="app__bar" data-tauri-drag-region>
        <div className="app__identity">
          <BrandMark />
          <h1 className="app__title">4GHz</h1>
          <span className="app__version">v{__APP_VERSION__}</span>
        </div>

        <div className="app__controls">
          <div className="app__status" aria-live="polite">
            {state.status === "ready" && (
              <p className="app__fetched">
                {refreshing
                  ? FETCH_LABELS.refreshing
                  : FETCH_LABELS.fetched(formatFetchedAt(state.cached.fetchedAt, current))}
              </p>
            )}
            <RefreshButton
              busy={refreshing}
              fetched={
                state.status === "ready"
                  ? FETCH_LABELS.fetched(formatFetchedAt(state.cached.fetchedAt, current))
                  : undefined
              }
              onRefresh={onRefresh}
            />
          </div>
          <GameFilterMenu filter={filter} onChoose={choose} />
        </div>

        <WindowControls />
      </header>

      <TabBar tab={tab} onOpen={setTab} />

      <UpdateBanner update={update} onInstall={onInstallUpdate} />

      <OverlayScrollbarsComponent
        element="main"
        className="app__main"
        id={panelId(tab)}
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        defer
        options={{
          scrollbars: { theme: "os-theme-4ghz", autoHide: "move", autoHideDelay: 700 },
        }}
      >
        {renderTab(tab, { state, onRefresh, now: current, usedCodes, dailies, filter })}
      </OverlayScrollbarsComponent>

      {tour.step && (
        <Spotlight
          step={tour.step}
          position={tour.position}
          total={tour.total}
          onNext={tour.next}
          onSkip={tour.skip}
        />
      )}
    </div>
  );
}

interface TabContext {
  state: SyncState;
  onRefresh: () => void;
  now: Date;
  usedCodes: ReturnType<typeof useUsedCodes>;
  dailies: ReturnType<typeof useDailyRecords>;
  filter: GameFilter;
}

function renderTab(tab: Tab, { state, onRefresh, now, usedCodes, dailies, filter }: TabContext) {
  if (tab === "dailies") {
    return (
      <DailiesTab
        records={dailies.records}
        filter={filter}
        now={now}
        onToggleChore={dailies.toggleChore}
        onToggleGame={dailies.toggleGame}
      />
    );
  }

  if (state.status === "loading") {
    return <Notice title="불러오는 중이에요" />;
  }

  if (state.status === "failed") {
    return state.problem.kind === "unsupported-schema" ? (
      <Notice
        title="앱을 업데이트해 주세요"
        detail="정보 형식이 바뀌어서 이 버전으로는 읽을 수 없어요"
      />
    ) : (
      <Notice
        title="가져오지 못했어요"
        detail={state.problem.detail}
        action={{ label: "다시 시도", onAction: onRefresh }}
      />
    );
  }

  const events = state.cached.feed.events.filter((event) => matchesFilter(event.game, filter));
  const codes = state.cached.feed.codes.filter((code) => matchesFilter(code.game, filter));
  return (
    <>
      {state.lastProblem && (
        <p className="app__stale">최신 내용을 받지 못해 마지막으로 받은 내용을 보여주고 있어요</p>
      )}
      {tab === "schedule" ? (
        renderSchedule(events, now)
      ) : (
        <CodeList codes={codes} used={usedCodes.used} now={now} onToggleUsed={usedCodes.toggle} />
      )}
    </>
  );
}

function renderSchedule(events: readonly GameEvent[], now: Date) {
  if (events.length === 0) {
    return <Notice title="예정된 일정이 없어요" detail="새 일정이 올라오면 여기에 표시돼요" />;
  }
  return <EventList events={events} now={now} />;
}
