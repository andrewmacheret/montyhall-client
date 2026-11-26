import { useCallback, useEffect, useRef, useState } from 'react';
import { callApi } from './api.js';
import Door from './Door.jsx';
import Stats from './Stats.jsx';

// the server allows the same range
const MIN_DOORS = 3;
const MAX_DOORS = 10;
const DOOR_CHOICES = Array.from({ length: MAX_DOORS - MIN_DOORS + 1 }, (_, i) => MIN_DOORS + i);
const DOORS_KEY = 'montyhall-doors';

// this browser's results, keyed like the server's stats ({"3": {"stayed-win": 1, "totals-win": 1}, ...})
const MY_STATS_KEY = 'montyhall-my-stats';

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage can be turned off, the choices just won't stick around
  }
}

function loadDoors() {
  const doors = load(DOORS_KEY);
  return DOOR_CHOICES.includes(doors) ? doors : MIN_DOORS;
}

function loadMyStats() {
  const stats = load(MY_STATS_KEY) ?? {};
  // stats saved before you could pick the number of doors were all 3-door games, like {"stayed-win": 2}
  return Object.keys(stats).some((key) => key.includes('-')) ? { 3: stats } : stats;
}

// fewest rows, then as even as possible, like 10 doors in two rows of 5
function columns(doors, maxColumns) {
  return Math.ceil(doors / Math.ceil(doors / maxColumns));
}

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// pending is the door that was just clicked, while we wait on the server
function message(game, pending) {
  if (!game) return { title: 'Setting the stage…', detail: 'Hiding a car behind one of the doors.' };
  const selected = game.doors.find((door) => door.state === 'SELECTED');
  if (pending && game.state === 'SELECT_A_DOOR') {
    const goats = game.doors.length - 2;
    return {
      title: `You picked door ${pending}`,
      detail: goats === 1 ? 'Monty is opening one of the other doors…' : `Monty is opening ${goats} of the other doors…`
    };
  }
  if (pending && game.state === 'SECOND_CHANCE') {
    return {
      title: `Opening door ${pending}…`,
      detail: pending === selected.number ? `You stayed with door ${pending}.` : `You switched from door ${selected.number}.`
    };
  }
  if (game.state === 'SELECT_A_DOOR') {
    return { title: 'Pick a door', detail: 'Behind one door is a car. Behind the others, goats.' };
  }
  if (game.state === 'SECOND_CHANCE') {
    const opened = game.doors.filter((door) => door.state === 'OPENED');
    const other = game.doors.find((door) => door.state === 'UNSELECTED');
    return {
      title: opened.length === 1
        ? `There's a goat behind door ${opened[0].number}`
        : `There are goats behind ${opened.length} doors`,
      detail: `Do you stay with door ${selected.number}, or switch to door ${other.number}?`
    };
  }
  // after a switch the first pick is still marked SELECTED
  const how = game.switched ? `You switched from door ${selected.number}` : 'You stayed';
  const odds = `Switching wins about ${game.doors.length - 1} games in ${game.doors.length}.`;
  return game.prize === 'WIN'
    ? { title: 'You won a car!', detail: `${how}. ${odds}`, tone: 'win' }
    : { title: 'You got a goat', detail: `${how}. ${odds}`, tone: 'lose' };
}

export default function Game() {
  const [doors, setDoors] = useState(loadDoors);
  const [game, setGame] = useState(null);
  const [finalPick, setFinalPick] = useState(null);
  const [pending, setPending] = useState(null);
  const [stats, setStats] = useState(null);
  const [myStats, setMyStats] = useState(loadMyStats);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const started = useRef(false);
  // the next game, made in the background once a game ends so Play again is instant
  const nextGame = useRef(null);

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

  const newGame = useCallback(async (oldGameId, numberOfDoors) => {
    if (oldGameId) {
      callApi(`/games/${oldGameId}`, 'DELETE').catch(() => {});
    }
    const next = nextGame.current;
    nextGame.current = null;
    let ready = null;
    if (next?.doors === numberOfDoors) {
      ready = await next.game;
    } else if (next) {
      next.game.then((unused) => unused && callApi(`/games/${unused.id}`, 'DELETE')).catch(() => {});
    }
    setFinalPick(null);
    setGame(ready ?? await callApi('/games', 'POST', { numberOfDoors }));
  }, []);

  useEffect(() => {
    // StrictMode runs effects twice in dev, so only start one game
    if (started.current) return;
    started.current = true;
    run(() => Promise.all([newGame(null, doors), loadStats()]));
  }, [run, newGame, loadStats, doors]);

  const changeDoors = (numberOfDoors) => {
    const oldGameId = game?.id;
    setDoors(numberOfDoors);
    save(DOORS_KEY, numberOfDoors);
    // show blank doors while the new game loads
    setGame(null);
    run(() => newGame(oldGameId, numberOfDoors));
  };

  const openDoor = (number) => {
    const doorState = game.state === 'SELECT_A_DOOR' ? 'SELECTED' : 'OPENED';
    // show the click right away, the server's answer fills in the rest
    setPending(number);
    if (doorState === 'OPENED') setFinalPick(number);
    run(async () => {
      try {
        // POST instead of PUT, since a PUT waits on a CORS preflight first
        const updated = await callApi(`/games/${game.id}/doors/${number}`, 'POST', { state: doorState });
        setGame(updated);
        if (updated.state === 'FINISHED') {
          recordMyGame(updated);
          const numberOfDoors = updated.doors.length;
          nextGame.current = {
            doors: numberOfDoors,
            game: callApi('/games', 'POST', { numberOfDoors }).catch(() => null)
          };
          // the game is done, so don't make the player wait on the stats
          loadStats().catch(() => {});
        }
      } catch (err) {
        if (doorState === 'OPENED') setFinalPick(null);
        throw err;
      } finally {
        setPending(null);
      }
    });
  };

  const recordMyGame = (finishedGame) => {
    const doorCount = finishedGame.doors.length;
    const prize = finishedGame.prize.toLowerCase();
    const choice = finishedGame.switched ? 'switched' : 'stayed';
    const counts = { ...loadMyStats()[doorCount] };
    for (const key of [`${choice}-${prize}`, `totals-${prize}`]) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const next = { ...loadMyStats(), [doorCount]: counts };
    save(MY_STATS_KEY, next);
    setMyStats(next);
  };

  const resetMyStats = () => {
    if (window.confirm(`Clear your ${doors}-door stats in this browser?`)) {
      const next = { ...loadMyStats() };
      delete next[doors];
      save(MY_STATS_KEY, next);
      setMyStats(next);
    }
  };

  const myDoorStats = myStats[doors] ?? {};
  const myGameCount = (myDoorStats['totals-win'] ?? 0) + (myDoorStats['totals-lose'] ?? 0);

  const playAgain = () => run(() => newGame(game?.id, doors));

  const finished = game?.state === 'FINISHED';
  const { title, detail, tone } = message(game, pending);
  const shownDoors = (game?.doors ?? Array.from({ length: doors }, (_, i) => ({ number: i + 1, state: 'UNSELECTED' })))
    .map((door) => (door.number === pending && game.state === 'SELECT_A_DOOR' ? { ...door, state: 'SELECTED' } : door));

  return (
    <main className="app">
      <header className="header">
        <div>
          <div className="title-row">
            <a className="home" href="https://andrewmacheret.com/">
              <img src="https://andrewmacheret.com/favicon.svg" alt="andrewmacheret.com" width="20" height="20" />
            </a>
            <span className="slash" aria-hidden="true">/</span>
            <h1>Monty Hall</h1>
          </div>
          <p>The game show puzzle that fools almost everyone.</p>
        </div>
        <label className="visually-hidden" htmlFor="doors">Number of doors</label>
        <select
          id="doors"
          className="select"
          value={doors}
          disabled={busy}
          onChange={(event) => changeDoors(Number(event.target.value))}
        >
          {DOOR_CHOICES.map((n) => (
            <option key={n} value={n}>{n} doors</option>
          ))}
        </select>
      </header>

      <section className={tone ? `stage stage-${tone}` : 'stage'} aria-labelledby="message">
        <div className="message" aria-live="polite">
          <h2 id="message">{title}</h2>
          <p>{detail}</p>
        </div>

        <div
          className={columns(shownDoors.length, 4) >= 4 ? 'doors doors-dense' : 'doors'}
          style={{ '--columns': columns(shownDoors.length, 6), '--columns-narrow': columns(shownDoors.length, 4) }}
          aria-busy={busy}
        >
          {shownDoors.map((door) => (
            <Door
              // a new game remounts the doors so they don't swing shut on screen
              key={`${game?.id}-${door.number}`}
              number={door.number}
              state={door.state}
              prize={door.prize}
              gameState={game?.state}
              isFinalPick={door.number === finalPick}
              opening={door.number === pending && game.state === 'SECOND_CHANCE'}
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
        title={`How you're doing with ${doors} doors`}
        doors={doors}
        stats={myDoorStats}
        action={myGameCount > 0 && (
          <button type="button" className="text-button" onClick={resetMyStats}>Reset</button>
        )}
      />
      <Stats
        id="stats-title"
        title={`How everyone's doing with ${doors} doors`}
        doors={doors}
        stats={stats && (stats[doors] ?? {})}
      />

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
