import gpio from 'rpi-gpio';
import config from '../config.json';

const debug = require('debug')('controller:sensor');

const closedPin = config.door.pins.closed;

gpio.setMode(gpio.MODE_RPI);

const readValue = () => {
    gpio.setup(closedPin, gpio.DIR_IN, function (err) {
        if (err) {
            debug('gpio setup error', err)
        } else {
            gpio.read(closedPin, function (err, value) {
                debug('readValue', value);
                if (err) {
                    debug('gpio read error', err);
                } else {
                    return value;
                }
            });
        }
    });
}

function isDoorClosed() {
    const status = readValue();

    debug('isDoorClosed', status);

    return status;
}

export default {isDoorClosed};
