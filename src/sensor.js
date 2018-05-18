import gpio from 'rpi-gpio';
import config from '../config.json';
import * as _ from 'lodash';
const debug = require('debug')('controller:sensor');

const closedPin = config.door.pins.closed;

gpio.setMode(gpio.MODE_RPI);

const readValue = () => {
    return new Promise((fulfill, reject) => {
        gpio.setup(config.door.pins.closed, gpio.DIR_IN, function () {
            gpio.read(config.door.pins.closed, function(err, value) {
                debug('readValue', value);
                if (err) {
                    debug('gpio read error', err);
                    reject(readValue());
                } else {
                    fulfill(value);
                }
            });
        });
    });
}

const isDoorClosed = async () => {
    const status = await readValue();

    debug('isDoorClosed', status);

    return status;
}

export default { isDoorClosed };
