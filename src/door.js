import Switch from './switch';
import Sensor from './sensor';

const debug = require('debug')('controller:door');

const door = {
  openDoor: async function() {
    debug('openDoor');

    Switch.toggle();
  },

  closeDoor: async function () {
    debug('closeDoor');

    Switch.toggle();
  },

  identify: function () {
    debug('identify');
  },

  isDoorClosed: function () {
    return Sensor.isDoorClosed();
  }
};

export default door;
