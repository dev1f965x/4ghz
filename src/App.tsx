import { useMemo } from "react";
import "./design/base.css";
import "./App.css";
import { EventList } from "./components/EventList";
import { Notice } from "./components/Notice";
import type { GameEvent } from "./domain/event";
import { formatFetchedAt } from "./domain/labels";

export interface AppProps {
  events: readonly GameEvent[];
  fetchedAt?: Date;
  now?: Date;
}

/**
 * The whole window: a header that says where the data came from, and the list.
 *
 * Events and the fetch time arrive as props so the shell stays free of loading concerns;
 * the caller owns fetching, caching, and the clock.
 */
export default function App({ events, fetchedAt, now = new Date() }: AppProps) {
  const fetched = useMemo(
    () => (fetchedAt ? formatFetchedAt(fetchedAt, now) : undefined),
    [fetchedAt, now],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">4GHz</h1>
          <p className="app__subtitle">원신 · 스타레일 · 젠레스 공식 일정</p>
        </div>
        {fetched && <p className="app__fetched">{fetched} 기준</p>}
      </header>

      <main className="app__main">
        {events.length === 0 ? (
          <Notice title="아직 불러온 일정이 없어요" detail="일정을 받아오면 여기에 표시돼요" />
        ) : (
          <EventList events={events} now={now} />
        )}
      </main>
    </div>
  );
}
