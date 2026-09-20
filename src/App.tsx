import { useRef } from "react";
import "./design/base.css";
import "./design/scrollbar.css";
import "./App.css";
import { EventList } from "./components/EventList";
import { Notice } from "./components/Notice";
import { useScrollActivity } from "./components/useScrollActivity";
import { WindowControls } from "./components/WindowControls";
import { formatFetchedAt } from "./domain/labels";
import type { SyncState } from "./feed/sync";

export interface AppProps {
  state: SyncState;
  onRefresh: () => void;
  now?: Date;
}

/**
 * The window. The header doubles as the title bar: the app draws its own so the top of
 * the window belongs to the same dark surface as the list below it.
 */
export default function App({ state, onRefresh, now = new Date() }: AppProps) {
  const scroller = useRef<HTMLElement>(null);
  const scrolling = useScrollActivity(scroller);
  const refreshing = state.status === "ready" && state.refreshing;

  return (
    <div className="app">
      <header className="app__header" data-tauri-drag-region>
        <div className="app__identity" data-tauri-drag-region>
          <h1 className="app__title">4GHz</h1>
          <p className="app__subtitle">원신 · 스타레일 · 젠레스 공식 일정</p>
        </div>

        <div className="app__actions">
          <div className="app__status" aria-live="polite">
            {state.status === "ready" && (
              <p className="app__fetched">
                {refreshing
                  ? "새로고침 중…"
                  : `${formatFetchedAt(state.cached.fetchedAt, now)} 기준`}
              </p>
            )}
            <button
              type="button"
              className="app__refresh"
              onClick={onRefresh}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              새로고침
            </button>
          </div>
          <WindowControls />
        </div>
      </header>

      <main className="app__main scroll-area" ref={scroller} data-scrolling={scrolling}>
        {renderBody(state, onRefresh, now)}
      </main>
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
