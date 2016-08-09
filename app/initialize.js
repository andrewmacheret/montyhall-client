import ReactDOM from 'react-dom';
import React from 'react';
import Game from 'components/game.react';

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(
    <Game />,
    document.querySelector('#app')
  );
});
