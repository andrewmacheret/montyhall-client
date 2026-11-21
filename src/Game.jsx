import { useCallback, useEffect, useRef, useState } from 'react';
import { callApi } from './api.js';
import Door from './Door.jsx';
import Stats from './Stats.jsx';

const PLACEHOLDER_DOORS = [1, 2, 3].map((number) => ({ number, state: 'UNSELECTED' }));

// this browser's results, keyed like the server's stats ("stayed-win", "totals-lose", ...)
const MY_STATS_KEY = 'montyhall-my-stats';

function loadMyStats() {
  try {
    return JSON.parse(localStorage.getItem(MY_STATS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveMyStats(stats) {
  try {
    localStorage.setItem(MY_STATS_KEY, JSON.stringify(stats));
  } catch {
    // storage can be turned off, the stats just won't stick around
  }
}

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function message(game) {
  if (!game) return { title: 'Setting the stage…', detail: 'Hiding a car behind one of the doors.' };
  const selected = game.doors.find((door) => door.state === 'SELECTED');
  if (game.state === 'SELECT_A_DOOR') {
    return { title: 'Pick a door', detail: 'Behind one door is a car. Behind the others, goats.' };
  }
  if (game.state === 'SECOND_CHANCE') {
    const opened = game.doors.find((door) => door.state === 'OPENED');
    return {
      title: `There's a goat behind door ${opened.number}`,
      detail: `Do you stay with door ${selected.number}, or switch?`
    };
  }
  // after a switch the first pick is still marked SELECTED
  const how = game.switched ? `You switched from door ${selected.number}` : 'You stayed';
  return game.prize === 'WIN'
    ? { title: 'You won a car!', detail: `${how}. Switching wins about 2 games in 3.`, tone: 'win' }
    : { title: 'You got a goat', detail: `${how}. Switching wins about 2 games in 3.`, tone: 'lose' };
}

export default function Game({ numberOfDoors }) {
  const [game, setGame] = useState(null);
  const [finalPick, setFinalPick] = useState(null);
  const [stats, setStats] = useState(null);
  const [myStats, setMyStats] = useState(loadMyStats);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const started = useRef(false);

  // runs an api action, blocking clicks until it's done
  const run = useCallback(async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const loadStats = useCallback(async () => setStats(await callApi('/stats')), []);

  const newGame = useCallback(async (oldGameId) => {
    if (oldGameId) {
      callApi(`/games/${oldGameId}`, 'DELETE').catch(() => {});
    }
    setFinalPick(null);
    setGame(await callApi('/games', 'POST', numberOfDoors ? { numberOfDoors } : {}));
  }, [numberOfDoors]);

  useEffect(() => {
    // StrictMode runs effects twice in dev, so only start one game
    if (started.current) return;
    started.current = true;
    run(() => Promise.all([newGame(), loadStats()]));
  }, [run, newGame, loadStats]);

  const openDoor = (number) => run(async () => {
    const doorState = game.state === 'SELECT_A_DOOR' ? 'SELECTED' : 'OPENED';
    await callApi(`/games/${game.id}/doors/${number}`, 'PUT', { state: doorState });
    if (doorState === 'OPENED') setFinalPick(number);
    const updated = await callApi(`/games/${game.id}`);
    setGame(updated);
    if (updated.state === 'FINISHED') {
      recordMyGame(updated);
      await loadStats();
    }
  });

  const recordMyGame = (finishedGame) => {
    const prize = finishedGame.prize.toLowerCase();
    const choice = finishedGame.switched ? 'switched' : 'stayed';
    const next = { ...loadMyStats() };
    for (const key of [`${choice}-${prize}`, `totals-${prize}`]) {
      next[key] = (next[key] ?? 0) + 1;
    }
    saveMyStats(next);
    setMyStats(next);
  };

  const resetMyStats = () => {
    if (window.confirm('Clear your stats in this browser?')) {
      saveMyStats({});
      setMyStats({});
    }
  };

  const myGameCount = (myStats['totals-win'] ?? 0) + (myStats['totals-lose'] ?? 0);

  const playAgain = () => run(() => newGame(game?.id));

  const finished = game?.state === 'FINISHED';
  const { title, detail, tone } = message(game);

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>Monty Hall</h1>
          <p>The game show puzzle that fools almost everyone.</p>
        </div>
      </header>

      <section className={tone ? `stage stage-${tone}` : 'stage'} aria-labelledby="message">
        <div className="message" aria-live="polite">
          <h2 id="message">{title}</h2>
          <p>{detail}</p>
        </div>

        <div className="doors" aria-busy={busy}>
          {(game?.doors ?? PLACEHOLDER_DOORS).map((door) => (
            <Door
              // a new game remounts the doors so they don't swing shut on screen
              key={`${game?.id}-${door.number}`}
              number={door.number}
              state={door.state}
              prize={door.prize}
              gameState={game?.state}
              isFinalPick={door.number === finalPick}
              disabled={busy || !game || finished}
              onOpen={openDoor}
            />
          ))}
        </div>

        {error && (
          <p className="error" role="alert">
            Something went wrong: {error}
          </p>
        )}

        <div className="dock">
          {/* stays in the layout so the doors don't jump when it shows up */}
          <button
            type="button"
            className="control primary"
            hidden={!finished && !(error && !game)}
            disabled={busy}
            onClick={playAgain}
          >
            <Icon>
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </Icon>
            {game ? 'Play again' : 'Try again'}
          </button>
        </div>
      </section>

      <Stats
        id="my-stats-title"
        title="How you're doing"
        stats={myStats}
        action={myGameCount > 0 && (
          <button type="button" className="text-button" onClick={resetMyStats}>Reset</button>
        )}
      />
      <Stats id="stats-title" title="How everyone's doing" stats={stats} />

      <footer className="footer">
        <a href="https://andrewmacheret.com/">More projects</a>
        <span aria-hidden="true">·</span>
        <a href="https://en.wikipedia.org/wiki/Monty_Hall_problem">Why does switching win?</a>
        <span aria-hidden="true">·</span>
        <a href="https://github.com/andrewmacheret/montyhall-client">Source</a>
      </footer>
    </main>
  );
}
