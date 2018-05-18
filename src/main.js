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

  doorAccessory
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, 'Overhead Door')
    .setCharacteristic(Characteristic.Model, '4040L')
    .setCharacteristic(Characteristic.SerialNumber, 'Serial Number');

  doorAccessory.on('identify', function (paired, callback) {
    doorController.identify();
    callback();
  });

  const doorState = () => doorController.isDoorOpened()
    ? Characteristic.TargetDoorState.OPEN
    : Characteristic.TargetDoorState.CLOSED;

  const initialDoorState = await doorState();

  debug('initial door state', initialDoorState);

  doorAccessory
    .addService(Service.GarageDoorOpener, 'Garage Door')
    .setCharacteristic(Characteristic.TargetDoorState, initialDoorState)
    .getCharacteristic(Characteristic.TargetDoorState)
    .on('set', async function(value, callback) {

      if (value == Characteristic.TargetDoorState.CLOSED) {
        doorAccessory
          .getService(Service.GarageDoorOpener)
          .setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
        debug('after CLOSING, before callback()')
        callback();
        debug('after CLOSING callback()')

        await doorController.openDoor();

        const doorState = await doorState();

        doorAccessory
          .getService(Service.GarageDoorOpener)
          .setCharacteristic(Characteristic.CurrentDoorState, doorState);
      }
      else if (value == Characteristic.TargetDoorState.OPEN) {
        doorAccessory
          .getService(Service.GarageDoorOpener)
          .setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
        debug('after OPENING, before callback()')
        callback();
        debug('after OPENING callback()')

        await doorController.closeDoor();

        const doorState = await doorState();

        doorAccessory
          .getService(Service.GarageDoorOpener)
          .setCharacteristic(Characteristic.CurrentDoorState, doorState);
      }
    });


  doorAccessory
    .getService(Service.GarageDoorOpener)
    .getCharacteristic(Characteristic.CurrentDoorState)
    .on('get', async function(callback) {

      let err = null;

      if (await doorController.isDoorOpened()) {
        debug('door is open');
        setCurrentDoorState(doorAccessory, true);
        callback(err, Characteristic.CurrentDoorState.OPEN);
      } else {
        debug('door is closed');
        setCurrentDoorState(doorAccessory, true);
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
  setCurrentDoorState(doorAccessory, false);
}

async function setCurrentDoorState(doorAccessory, now) {
  
  const currentDoorState = () => doorController.isDoorOpened()
    ? Characteristic.CurrentDoorState.OPEN
    : Characteristic.CurrentDoorState.CLOSED;    
    if (now) {
      const doorState = await currentDoorState();
      setDoorState(doorAccessory, Service.GarageDoorOpener, Characteristic.CurrentDoorState, doorState)
    } else {
      setInterval(async function() {
        const doorState = await currentDoorState();

        setDoorState(doorAccessory, Service.GarageDoorOpener, Characteristic.CurrentDoorState, doorState)
      }, 10000);
    }
}

function setDoorState(accessory, service, state, value) {
  accessory
    .getService(service)
    .setCharacteristic(state, value);
}


controller();
