import { Accessory, Service, Characteristic, uuid } from 'hap-nodejs';
import storage from 'node-persist';
import doorController from './door';
import config from '../config.json';
const debug = require('debug')('controller:main');

storage.initSync();

debug(`accessory name: ${config.door.accessory.name}`);
debug(`accessory username: ${config.door.accessory.username}`);
debug(`accessory pincode: ${config.door.accessory.pincode}`);
debug(`accessory port: ${config.door.accessory.port}`);

async function controller() {
    const doorUUID = uuid.generate(`hap-nodejs:accessories:${config.door.accessory.name}`);
    const doorAccessory = exports.accessory = new Accessory(config.door.accessory.name, doorUUID);

// Door Accessory

doorAccessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, 'Overhead Door')
    .setCharacteristic(Characteristic.Model, '4040L')
    .setCharacteristic(Characteristic.SerialNumber, 'Serial Number');

    doorAccessory.on('identify', function (paired, callback) {
        doorController.identify();
        callback();
    });

    const doorState = async () => await doorController.isDoorOpened() ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED;

    const initialDoorState = await doorState();
    debug('initial door state', initialDoorState);

    doorAccessory.addService(Service.GarageDoorOpener, 'Garage Door')
    .setCharacteristic(Characteristic.TargetDoorState, initialDoorState)
    .getCharacteristic(Characteristic.TargetDoorState)
    .on('set', async function(value, callback) {
        let curDoorState = await doorState();

        if (value == Characteristic.TargetDoorState.CLOSED) {

            if ([Characteristic.TargetDoorState.CLOSED, Characteristic.TargetDoorState.CLOSING].indexOf(curDoorState) < 0) {
                doorAccessory.getService(Service.GarageDoorOpener)
                .setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
                callback();

                await doorController.openDoor();

                curDoorState = await doorState();

                doorAccessory
                .getService(Service.GarageDoorOpener)
                .setCharacteristic(Characteristic.CurrentDoorState, curDoorState);
            } else {
                debug('ALREADY CLOSED; staying closed');
                callback();
            }
        } else if (value == Characteristic.TargetDoorState.OPEN) {
            if ([Characteristic.TargetDoorState.OPEN, Characteristic.TargetDoorState.OPENING].indexOf(curDoorState) < 0) {
                doorAccessory
                .getService(Service.GarageDoorOpener)
                .setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
                callback();

                await doorController.closeDoor();

                curDoorState = await doorState();

                doorAccessory
                .getService(Service.GarageDoorOpener)
                .setCharacteristic(Characteristic.CurrentDoorState, curDoorState);
            } else {
                debug('ALREADY OPEN; staying open');
                callback();
            }
        }
    });

    doorAccessory
    .getService(Service.GarageDoorOpener)
    .getCharacteristic(Characteristic.CurrentDoorState)
    .on('get', async function(callback) {

        let err = null;

        if (await doorController.isDoorOpened()) {
            debug('door is open');
            callback(err, Characteristic.CurrentDoorState.OPEN);
        } else {
            debug('door is closed');
            callback(err, Characteristic.CurrentDoorState.CLOSED);
        }
    });


    debug('publish door accessory');
    doorAccessory.publish({
        port: config.door.accessory.port,
        username: config.door.accessory.username,
        pincode: config.door.accessory.pincode,
        category: Accessory.Categories.GARAGE_DOOR_OPENER,
    });
}

controller();
