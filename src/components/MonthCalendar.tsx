import { useState } from "react";
import { type DailyRecords, type GameDay, isComplete, monthGrid } from "../domain/dailies";
import type { Game } from "../domain/event";
import { DAILIES_LABELS, GAME_LABELS } from "../domain/labels";
import "./MonthCalendar.css";

interface Props {
  records: DailyRecords;
  /** The games on screen; a day shows a dot for each of these it finished. */
  games: readonly Game[];
  today: GameDay;
}

/** A month of game days, each marked with a dot per game finished that day. */
export function MonthCalendar({ records, games, today }: Props) {
  const [year, month] = today.split("-").map(Number);
  const [shown, setShown] = useState({ year, month });

  const step = (delta: number) =>
    setShown(({ year, month }) => {
      const index = year * 12 + (month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });

  return (
    <section className="calendar" aria-labelledby="calendar-title">
      <header className="calendar__header">
        <h2 id="calendar-title">{DAILIES_LABELS.month(shown.year, shown.month)}</h2>
        <div className="calendar__steps">
          <button type="button" aria-label={DAILIES_LABELS.previousMonth} onClick={() => step(-1)}>
            ‹
          </button>
          <button type="button" aria-label={DAILIES_LABELS.nextMonth} onClick={() => step(1)}>
            ›
          </button>
        </div>
      </header>

      <table className="calendar__grid">
        <thead>
          <tr>
            {DAILIES_LABELS.weekdays.map((weekday) => (
              <th key={weekday} scope="col">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(shown.year, shown.month).map((week) => (
            <tr key={week.find(Boolean)}>
              {week.map((day, index) => (
                <td key={day ?? `blank-${index}`}>
                  {day && <Day day={day} records={records} games={games} today={today} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface DayProps {
  day: GameDay;
  records: DailyRecords;
  games: readonly Game[];
  today: GameDay;
}

function Day({ day, records, games, today }: DayProps) {
  const finished = games.filter((game) => isComplete(records, day, game));

  return (
    <div className="calendar__day" data-today={day === today} data-future={day > today}>
      <span>{Number(day.slice(8))}</span>
      <span className="visually-hidden">
        {DAILIES_LABELS.finished(finished.map((game) => GAME_LABELS[game]))}
      </span>
      <span className="calendar__dots" aria-hidden="true">
        {finished.map((game) => (
          <span key={game} className="calendar__dot" data-game={game} />
        ))}
      </span>
    </div>
  );
}
