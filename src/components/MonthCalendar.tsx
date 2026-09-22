import { useState } from "react";
import {
  type Chores,
  type DailyRecords,
  type GameDay,
  isComplete,
  isPerfectDay,
  monthGrid,
} from "../domain/dailies";
import type { Game } from "../domain/event";
import { DAILIES_LABELS, GAME_LABELS } from "../domain/labels";
import "./MonthCalendar.css";

interface Props {
  records: DailyRecords;
  chores: Chores;
  /** The games on screen; a day shows a dot for each of these it finished. */
  games: readonly Game[];
  today: GameDay;
}

/** A month of game days, each marked with a dot per game finished that day. */
export function MonthCalendar({ records, chores, games, today }: Props) {
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
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m10 3.5-4.5 4.5 4.5 4.5" />
            </svg>
          </button>
          <button type="button" aria-label={DAILIES_LABELS.nextMonth} onClick={() => step(1)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m6 3.5 4.5 4.5-4.5 4.5" />
            </svg>
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
                  {day && (
                    <Day day={day} records={records} chores={chores} games={games} today={today} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="calendar__legend">
        {games.length > 1 && (
          <span className="calendar__key">
            <span className="calendar__dots" aria-hidden="true">
              {games.map((game) => (
                <span key={game} className="calendar__dot" data-game={game} />
              ))}
            </span>
            {DAILIES_LABELS.legendSome}
          </span>
        )}
        <span className="calendar__key">
          <span className="calendar__key-fill" style={fillOf(games)} aria-hidden="true" />
          {games.length > 1 ? DAILIES_LABELS.legendAll : DAILIES_LABELS.legendOne}
        </span>
      </p>
    </section>
  );
}

interface DayProps {
  day: GameDay;
  records: DailyRecords;
  chores: Chores;
  games: readonly Game[];
  today: GameDay;
}

/**
 * A day with a dot per game finished. A day on which every game in view was finished
 * drops the dots and fills with those games' colours instead: the one mark that says
 * the day is done. Hovering names the result.
 */
function Day({ day, records, chores, games, today }: DayProps) {
  const finished = games.filter((game) => isComplete(records, chores, day, game));
  const perfect = isPerfectDay(records, chores, day, games);
  const fill = perfect ? fillOf(games) : undefined;
  const result = perfect
    ? DAILIES_LABELS.perfect
    : DAILIES_LABELS.finished(finished.map((game) => GAME_LABELS[game]));

  return (
    <div
      className="calendar__day"
      data-today={day === today}
      data-future={day > today}
      data-perfect={perfect}
      style={fill}
      title={result}
    >
      <span>{Number(day.slice(8))}</span>
      <span className="visually-hidden">{result}</span>
      <span className="calendar__dots" aria-hidden="true">
        {!perfect &&
          finished.map((game) => <span key={game} className="calendar__dot" data-game={game} />)}
      </span>
    </div>
  );
}

/**
 * The games' colours run corner to corner, blended in OKLCH so a blue-to-orange fill turns
 * through its hues instead of greying out in the middle. One game is its colour alone.
 */
function fillOf(games: readonly Game[]) {
  const colours = games.map((game) => `var(--game-${game})`);
  return {
    background:
      colours.length > 1 ? `linear-gradient(135deg in oklch, ${colours.join(", ")})` : colours[0],
  };
}
