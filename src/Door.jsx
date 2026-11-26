import carImage from './images/car.jpg';
import doorImage from './images/door.jpg';
import goatsImage from './images/goats.jpg';

const PRIZES = {
  WIN: { src: carImage, name: 'Car' },
  LOSE: { src: goatsImage, name: 'Goats' }
};

// load the prize photos early so a door never opens onto a blank space
for (const { src } of Object.values(PRIZES)) {
  new Image().src = src;
}

function tagFor({ state, prize, gameState, isFinalPick }) {
  // only while the first pick is on its way to the server
  if (gameState === 'SELECT_A_DOOR' && state === 'SELECTED') return { text: 'Your pick', kind: 'pick' };
  if (gameState === 'SECOND_CHANCE') {
    if (state === 'SELECTED') return { text: 'Stay', kind: 'pick' };
    if (state === 'UNSELECTED') return { text: 'Switch', kind: 'switch' };
  }
  if (gameState === 'FINISHED') {
    if (isFinalPick) return { text: 'Your door', kind: prize === 'WIN' ? 'win' : 'lose' };
    if (state === 'SELECTED') return { text: 'First pick', kind: 'muted' };
  }
  return null;
}

export default function Door({ number, state, prize, gameState, isFinalPick, opening, disabled, onOpen }) {
  const opened = state === 'OPENED';
  const revealed = PRIZES[prize];
  const tag = tagFor({ state, prize, gameState, isFinalPick });

  let label = `Door ${number}`;
  if (revealed) label += `, ${revealed.name.toLowerCase()}`;
  if (tag) label += `, ${tag.text.toLowerCase()}`;

  const classes = ['door', `state-${state}`, `game-${gameState}`];
  if (opened) classes.push('open');
  if (opening) classes.push('opening');
  if (isFinalPick && prize) classes.push(prize === 'WIN' ? 'final-win' : 'final-lose');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      disabled={disabled || opened}
      onClick={() => onOpen(number)}
      aria-label={label}
    >
      <span className="door-frame">
        <span className="door-prize">
          {revealed && <img src={revealed.src} alt="" />}
          {revealed && <span className={`prize-chip prize-${prize}`}>{revealed.name}</span>}
          <span className="door-number">{number}</span>
        </span>
        <span className="door-panel">
          <img src={doorImage} alt="" />
          <span className="door-number">{number}</span>
        </span>
      </span>
      <span className={`door-tag ${tag ? `tag-${tag.kind}` : 'tag-empty'}`}>{tag?.text ?? '\u00a0'}</span>
    </button>
  );
}
