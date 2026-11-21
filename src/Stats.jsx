// the host opens every door but one, so staying wins 1 game in N and switching wins the rest
const groups = (doors) => [
  { key: 'stayed', label: 'Stayed', theory: 1 / doors },
  { key: 'switched', label: 'Switched', theory: (doors - 1) / doors },
  { key: 'totals', label: 'All games' }
];

const count = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

function StatCard({ label, meterLabel, theory, wins, losses }) {
  const games = wins + losses;
  const rate = games === 0 ? null : wins / games;
  const percent = rate === null ? '–' : `${(rate * 100).toFixed(1)}%`;

  return (
    <div className="card stat-card">
      <div className="stat-head">
        <h3>{label}</h3>
        {theory !== undefined && <span className="stat-theory">Theory {(theory * 100).toFixed(1)}%</span>}
      </div>
      <p className="stat-rate">
        {percent}
        <span> cars</span>
      </p>
      <div
        className="stat-bar"
        role="meter"
        aria-label={meterLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rate === null ? 0 : Math.round(rate * 1000) / 10}
        aria-valuetext={percent}
      >
        <span className="stat-fill" style={{ width: `${(rate ?? 0) * 100}%` }} />
        {theory !== undefined && <span className="stat-marker" style={{ left: `${theory * 100}%` }} />}
      </div>
      <p className="stat-counts">
        {count(games, 'game', 'games')} · {count(wins, 'car', 'cars')} · {count(losses, 'goat', 'goats')}
      </p>
    </div>
  );
}

export default function Stats({ id, title, doors, stats, action }) {
  return (
    <section className="stats" aria-labelledby={id}>
      <div className="stats-head">
        <h2 id={id} className="section-head">{title}</h2>
        {action}
      </div>
      <div className="stat-cards" aria-busy={!stats}>
        {groups(doors).map(({ key, label, theory }) => (
          <StatCard
            key={key}
            label={label}
            meterLabel={`${title}, ${label.toLowerCase()} car rate`}
            theory={theory}
            wins={stats?.[`${key}-win`] ?? 0}
            losses={stats?.[`${key}-lose`] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
