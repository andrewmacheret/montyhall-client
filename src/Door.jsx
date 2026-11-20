import carImage from './images/car.jpg';
import doorImage from './images/door.jpg';
import goatsImage from './images/goats.jpg';

const IMAGES = {
  WIN: { src: carImage, alt: 'a car' },
  LOSE: { src: goatsImage, alt: 'goats' }
};

export default function Door({ number, state, prize, disabled, onOpen }) {
  const image = IMAGES[prize] ?? { src: doorImage, alt: 'a closed door' };
  const label = `Door ${number}${state === 'SELECTED' ? ' (your pick)' : ''}: ${image.alt}`;

  return (
    <button
      type="button"
      className={`door state-${state}`}
      disabled={disabled || state === 'OPENED'}
      onClick={() => onOpen(number)}
      aria-label={label}
    >
      <img src={image.src} alt="" />
    </button>
  );
}
