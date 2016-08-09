var React = require('react');
/*eslint-disable */ //this is stupid
var ReactDOM = require('react-dom');
/*eslint-enable */
//var fetch = require('fetch');

var SETTINGS_JSON = 'settings.json';

var Door = require('./door.react');

var Game = React.createClass({
  propTypes: {
    numberOfDoors: React.PropTypes.number
  },

  getInitialState: function() {
    return {
      id: null,
      state: null,
      doors: [],
      stats: {
      },
      statsLoaded: false
    };
  },

  getSettings: function(callback) {
    fetch(SETTINGS_JSON).then(function(response) {
      response.json().then(function(json) {
        if(callback) {
          this.settings = json;
          callback();
        }
      }.bind(this));
    }.bind(this));
  },

  callApi: function(options, callback) {
    //options: relativeUrl, method, body

    //var baseUrl = 'http://localhost:8080/api/v1/monty/';
    var baseUrl = this.settings.api;

    var headers = new Headers();
    headers.append('Content-Type', 'application/json');
    fetch(baseUrl + options.relativeUrl, {
      method: options.method,
      headers: headers,
      mode: 'cors',
      body: options.body ? JSON.stringify(options.body) : null
    }).then(function(response) {
      response.json().then(function(json) {
        if(callback) {
          callback(json);
        }
      }.bind(this));
    }.bind(this));
  },

  getDoors: function(forceNewGame) {
    var options = {};
    if (this.props.numberOfDoors) {
      options.numberOfDoors = this.props.numberOfDoors;
    }

    var newGame = (this.state.id == null || forceNewGame);
    this.callApi({
      relativeUrl: newGame ? 'game' : 'game/' + this.state.id,
      method: newGame ? 'POST' : 'GET',
      body: newGame ? options : null
    }, function(json) {
      var state = this.state;
      state.id = json.id;
      state.state = json.state;
      state.doors = [];
      for (var i=0; i<json.doors.length; i++) {
        var door = json.doors[i];
        state.doors.push({
          number: door.number,
          state: door.state,
          prize: door.prize
        });
      }

      if (json.state == 'FINISHED') {
        state.switched = json.switched;
        state.prize = json.prize;
      }

      if (json.state == 'FINISHED' || !this.statsLoaded) {
        this.getStats();
        this.statsLoaded = true;
      }

      this.setState(state);
    }.bind(this));
  },

  getStats: function() {
    this.callApi({
      relativeUrl: 'stats',
      method: 'GET'
    }, function(json) {
      var state = this.state;
      state.stats = json;
      this.setState(state);
    }.bind(this));
  },

  putDoor: function(doorNumber, doorState) {
    this.callApi({
      relativeUrl: 'game/' + this.state.id + '/door/' + doorNumber,
      method: 'PUT',
      body: {state: doorState}
    }, function() {
      this.getDoors();
    }.bind(this));
  },

  restartGame: function() {
    this.callApi({
      relativeUrl: 'game/' + this.state.id,
      method: 'DELETE'
    }, function() {
      this.getDoors(true);
    }.bind(this));
  },

  componentWillMount: function() {
    this.getSettings(function() {
      this.getDoors();
    }.bind(this));
  },

  openDoor: function(number) {
    if (this.state.state == 'SELECT_A_DOOR') {
      this.putDoor(number, 'SELECTED');
    } else if (this.state.state == 'SECOND_CHANCE') {
      this.putDoor(number, 'OPENED');
    } else if (this.state.state == 'FINISHED') {
      this.restartGame();
    } else {
      return;
    }
  },

  calculateWinRatio: function(statName) {
    var win = this.state.stats[statName + '-win'] || 0;
    var lose = this.state.stats[statName + '-lose'] || 0;
    var total = win + lose;

    if (total == 0) {
      return 'N/A';
    }

    return (Math.round((win / total) * 10000) / 100) + '%';
  },

  render: function() {
    var doorNodes = this.state.doors.map(function(door) {
      return (
        <Door
          key={'door-' + door.number}
          number={door.number}
          state={door.state}
          prize={door.prize}
          openDoor={this.openDoor} />
      );
    }.bind(this));

    var newGameLink = [];
    var message = '';
    var openedDoor;
    if (this.state.state == 'SELECT_A_DOOR') {
      message = 'Behind one door is a car, behind the others are goats.';
    } else if (this.state.state == 'SECOND_CHANCE') {
      openedDoor = this.state.doors.find(function(door) {
        return door.state == 'OPENED';
      });
      message = 'I\'ll give you a chance: it\'s not behind door number ' + openedDoor.number + '.';
    } else if (this.state.state == 'FINISHED') {
      if (this.state.prize == 'WIN') {
        message = 'Congratulations, you win a car!';
      } else if (this.state.prize == 'LOSE') {
        message = 'Sorry, you win a goat.';
      }
      newGameLink.push(
        <a key="new-game-link" className="new-game-link" href="#" onClick={this.restartGame}>New Game</a>
      );
    }

    return (
      <div className="game">
        {newGameLink}
        <h1 className="message">{message}</h1>
        <div className="stats">
          <h2 className="stats-stayed">
            <span className="stat-label">Stayed</span>
            <span className="stat-text">Cars Won: {this.state.stats['stayed-win'] || 0}</span>
            <span className="stat-text">Goats Won: {this.state.stats['stayed-lose'] || 0}</span>
            <span className="stat-text">Car Ratio: {this.calculateWinRatio('stayed')}</span>
          </h2>
          <h2 className="stats-switched">
            <span className="stat-label">Switched</span>
            <span className="stat-text">Cars Won: {this.state.stats['switched-win'] || 0}</span>
            <span className="stat-text">Goats Won: {this.state.stats['switched-lose'] || 0}</span>
            <span className="stat-text">Car Ratio: {this.calculateWinRatio('switched')}</span>
          </h2>
          <h2 className="stats-totals">
            <span className="stat-label">Total</span>
            <span className="stat-text">Cars Won: {this.state.stats['totals-win'] || 0}</span>
            <span className="stat-text">Goats Won: {this.state.stats['totals-lose'] || 0}</span>
            <span className="stat-text">Car Ratio: {this.calculateWinRatio('totals')}</span>
          </h2>
        </div>
        <div className="doors">
          {doorNodes}
        </div>
      </div>
    );
  }
});

module.exports = Game;
