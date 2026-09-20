import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "./design/base.css";
import "./design/scrollbar.css";
import "./App.css";
import { BrandMark } from "./components/BrandMark";
import { EventList } from "./components/EventList";
import { Notice } from "./components/Notice";
import { RefreshButton } from "./components/RefreshButton";
import { TitleBar } from "./components/TitleBar";
import { formatFetchedAt } from "./domain/labels";
import type { SyncState } from "./feed/sync";
import { Spotlight } from "./onboarding/Spotlight";
import type { TourMemory } from "./onboarding/useTour";
import { useTour } from "./onboarding/useTour";

export interface AppProps {
  state: SyncState;
  onRefresh: () => void;
  tourMemory: TourMemory;
  now?: Date;
}

/**
 * The window, in three bands: the strip that replaces the system title bar, the header
 * that names the app and carries its one action, and the schedule, which is the only
 * part that scrolls.
 */
export default function App({ state, onRefresh, tourMemory, now = new Date() }: AppProps) {
  const refreshing = state.status === "ready" && state.refreshing;
  const hasEvents = state.status === "ready" && state.cached.feed.events.length > 0;
  const tour = useTour(tourMemory, hasEvents);

  return (
    <div className="app">
      <TitleBar />

      <header className="app__header">
        <div className="app__identity">
          <BrandMark />
          <div>
            <h1 className="app__title">4GHz</h1>
            <p className="app__subtitle">원신 · 스타레일 · 젠레스 공식 일정</p>
          </div>
        </div>

        <div className="app__status" aria-live="polite">
          {state.status === "ready" && (
            <p className="app__fetched">
              {refreshing ? "새로고침 중…" : formatFetchedAt(state.cached.fetchedAt, now)}
            </p>
          )}
          <RefreshButton busy={refreshing} onRefresh={onRefresh} />
        </div>
      </header>

      <OverlayScrollbarsComponent
        element="main"
        className="app__main"
        defer
        options={{
          scrollbars: { theme: "os-theme-4ghz", autoHide: "move", autoHideDelay: 700 },
        }}
      >
        {renderBody(state, onRefresh, now)}
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

function renderBody(state: SyncState, onRefresh: () => void, now: Date) {
  if (state.status === "loading") {
    return <Notice title="일정을 불러오는 중이에요" />;
  }

  if (state.status === "failed") {
    return state.problem.kind === "unsupported-schema" ? (
      <Notice
        title="앱을 업데이트해 주세요"
        detail="일정 형식이 바뀌어서 이 버전으로는 읽을 수 없어요"
      />
    ) : (
      <Notice
        title="일정을 가져오지 못했어요"
        detail={state.problem.detail}
        action={{ label: "다시 시도", onAction: onRefresh }}
      />
    );
  }

  const { events } = state.cached.feed;
  if (events.length === 0) {
    return <Notice title="예정된 일정이 없어요" detail="새 일정이 올라오면 여기에 표시돼요" />;
  }

  return (
    <>
      {state.lastProblem && (
        <p className="app__stale">최신 일정을 받지 못해 마지막으로 받은 내용을 보여주고 있어요</p>
      )}
      <EventList events={events} now={now} />
    </>
  );
}
