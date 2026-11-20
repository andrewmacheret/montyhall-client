import { useCallback, useEffect, useRef, useState } from 'react';
import { callApi } from './api.js';
import Door from './Door.jsx';

const STAT_GROUPS = [
  ['stayed', 'Stayed'],
  ['switched', 'Switched'],
  ['totals', 'Total']
];

function winRatio(stats, group) {
  const win = stats[`${group}-win`] || 0;
  const lose = stats[`${group}-lose`] || 0;
  const total = win + lose;
  return total === 0 ? 'N/A' : `${Math.round((win / total) * 10000) / 100}%`;
}

function message(game) {
  if (!game) return 'Loading...';
  if (game.state === 'SELECT_A_DOOR') return 'Behind one door is a car, behind the others are goats.';
  if (game.state === 'SECOND_CHANCE') {
    const openedDoor = game.doors.find((door) => door.state === 'OPENED');
    return `I'll give you a chance: it's not behind door number ${openedDoor.number}.`;
  }
  return game.prize === 'WIN' ? 'Congratulations, you win a car!' : 'Sorry, you win a goat.';
}

export default function Game({ numberOfDoors }) {
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState({});
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
    setGame(await callApi('/games', 'POST', numberOfDoors ? { numberOfDoors } : {}));
  }, [numberOfDoors]);

  useEffect(() => {
    // StrictMode runs effects twice in dev, so only start one game
    if (started.current) return;
    started.current = true;
    run(() => Promise.all([newGame(), loadStats()]));
  }, [run, newGame, loadStats]);

  const openDoor = (number) => run(async () => {
    if (game.state === 'FINISHED') {
      await newGame(game.id);
      return;
    }
    const doorState = game.state === 'SELECT_A_DOOR' ? 'SELECTED' : 'OPENED';
    await callApi(`/games/${game.id}/doors/${number}`, 'PUT', { state: doorState });
    const updated = await callApi(`/games/${game.id}`);
    setGame(updated);
    if (updated.state === 'FINISHED') {
      await loadStats();
    }
  });

  const restart = (event) => {
    event.preventDefault();
    run(() => newGame(game.id));
  };

  return (
    <div className="game">
      {game?.state === 'FINISHED' && (
        <a className="new-game-link" href="#" onClick={restart}>New Game</a>
      )}
      <h1 className="message">{message(game)}</h1>
      {error && <p className="error" role="alert">Something went wrong: {error}</p>}
      <div className="stats">
        {STAT_GROUPS.map(([group, label]) => (
          <h2 key={group} className={`stats-${group}`}>
            <span className="stat-label">{label}</span>
            <span className="stat-text">Cars Won: {stats[`${group}-win`] || 0}</span>
            <span className="stat-text">Goats Won: {stats[`${group}-lose`] || 0}</span>
            <span className="stat-text">Car Ratio: {winRatio(stats, group)}</span>
          </h2>
        ))}
      </div>
      <div className="doors">
        {game?.doors.map((door) => (
          <Door
            key={door.number}
            number={door.number}
            state={door.state}
            prize={door.prize}
            disabled={busy}
            onOpen={openDoor}
          />
        ))}
      </div>
    </div>
  );
}
