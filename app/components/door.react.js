var React = require('react');
/*eslint-disable */ //this is stupid
var ReactDOM = require('react-dom');
/*eslint-enable */

var Door = React.createClass({
  propTypes: {
    number: React.PropTypes.number.isRequired,
    state: React.PropTypes.string.isRequired, // UNSELECTED, SELECTED, OPENED
    prize: React.PropTypes.string,            // LOSE, WIN
    openDoor: React.PropTypes.func.isRequired
  },

  getInitialState: function() {
    return {
    };
  },

  render: function() {
    var className = 'door';
    if (this.props.state) {
      className += ' state-' + this.props.state;
    }
    if (this.props.prize) {
      className += ' prize-' + this.props.prize;
    }
    var onDoorClick = function() {
      if (this.props.state !== 'OPENED') {
        this.props.openDoor(this.props.number);
      }
    }.bind(this);

    return (
      <div className={className} onClick={onDoorClick} />
    );
  }
});

module.exports = Door;
