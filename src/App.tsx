import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "./design/base.css";
import "./design/scrollbar.css";
import "./App.css";
import type { UsedCodesMemory } from "./codes/usedCodes";
import { useUsedCodes } from "./codes/useUsedCodes";
import { BrandMark } from "./components/BrandMark";
import { CodeList } from "./components/CodeList";
import { DailiesTab } from "./components/DailiesTab";
import { EventList } from "./components/EventList";
import { Notice } from "./components/Notice";
import { RefreshButton } from "./components/RefreshButton";
import { panelId, TabBar, tabId } from "./components/TabBar";
import { TitleBar } from "./components/TitleBar";
import { UpdateBanner } from "./components/UpdateBanner";
import { useMinimumDuration } from "./components/useMinimumDuration";
import type { DailyRecordsMemory } from "./dailies/dailyRecords";
import { useDailyRecords } from "./dailies/useDailyRecords";
import type { GameEvent } from "./domain/event";
import { formatFetchedAt } from "./domain/labels";
import type { SyncState } from "./feed/sync";
import type { Tab } from "./navigation/history";
import { useNavigation } from "./navigation/useNavigation";
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
  update?: UpdateState;
  onInstallUpdate?: () => void;
  /** Fixed by tests; the window reads a ticking clock. */
  now?: Date;
}

/**
 * The window, in three bands: the strip that replaces the system title bar, the header
 * that names the app and carries its one action, and the schedule, which is the only
 * part that scrolls.
 */
export default function App({
  state,
  onRefresh,
  tourMemory,
  usedCodesMemory,
  dailiesMemory,
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
  const navigation = useNavigation();
  const usedCodes = useUsedCodes(usedCodesMemory);
  const dailies = useDailyRecords(dailiesMemory);

  return (
    <div className="app">
      <TitleBar
        canGoBack={navigation.canGoBack}
        canGoForward={navigation.canGoForward}
        onBack={navigation.goBack}
        onForward={navigation.goForward}
      />

      <header className="app__header">
        <div className="app__masthead">
          <div className="app__identity">
            <BrandMark />
            <div>
              <h1 className="app__title">4GHz</h1>
              <p className="app__subtitle">원신 · 스타레일 · 젠레스</p>
            </div>
          </div>

          <div className="app__status" aria-live="polite" hidden={navigation.tab === "dailies"}>
            {state.status === "ready" && (
              <p className="app__fetched">
                {refreshing ? "새로고침 중…" : formatFetchedAt(state.cached.fetchedAt, current)}
              </p>
            )}
            <RefreshButton busy={refreshing} onRefresh={onRefresh} />
          </div>
        </div>

        <TabBar tab={navigation.tab} onOpen={navigation.open} />
      </header>

      <UpdateBanner update={update} onInstall={onInstallUpdate} />

      <OverlayScrollbarsComponent
        element="main"
        className="app__main"
        id={panelId(navigation.tab)}
        role="tabpanel"
        aria-labelledby={tabId(navigation.tab)}
        defer
        options={{
          scrollbars: { theme: "os-theme-4ghz", autoHide: "move", autoHideDelay: 700 },
        }}
      >
        {renderTab(navigation.tab, { state, onRefresh, now: current, usedCodes, dailies })}
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
}

function renderTab(tab: Tab, { state, onRefresh, now, usedCodes, dailies }: TabContext) {
  if (tab === "dailies") {
    return (
      <DailiesTab
        records={dailies.records}
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

  const { events, codes } = state.cached.feed;
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
