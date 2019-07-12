import {Accessory, Characteristic, Service, uuid} from 'hap-nodejs'
import storage from 'node-persist'
import doorController from './door'
import config from '../config.json'
import Camera from './camera'

const debug = require('debug')('controller:main')

storage.initSync()

debug(`accessory name: ${config.door.accessory.name}`)
debug(`accessory username: ${config.door.accessory.username}`)
debug(`accessory pincode: ${config.door.accessory.pincode}`)
debug(`accessory port: ${config.door.accessory.port}`)

debug(`camera name: ${config.camera.accessory.name}`)
debug(`camera username: ${config.camera.accessory.username}`)
debug(`camera pincode: ${config.camera.accessory.pincode}`)
debug(`camera port: ${config.camera.accessory.port}`)

const doorUUID = uuid.generate(`hap-nodejs:accessories:${config.door.accessory.name}`)
const doorAccessory = exports.accessory = new Accessory(config.door.accessory.name, doorUUID)

const cameraSource = new Camera()
const cameraUUID = uuid.generate(`hap-nodejs:accessories:${config.camera.accessory.name}`)
const cameraAccessory = exports.camera = new Accessory(config.camera.accessory.name, cameraUUID)

async function controller() {
    // Door Accessory
    doorAccessory
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, 'Overhead Door')
        .setCharacteristic(Characteristic.Model, '4040L')
        .setCharacteristic(Characteristic.SerialNumber, 'Serial Number')

    doorAccessory.on('identify', function (paired, callback) {
        doorController.identify()
        callback()
    })

    const sensorState = () => doorController.isDoorClosed()
        ? Characteristic.CurrentDoorState.OPEN
        : Characteristic.CurrentDoorState.CLOSED

    const initialSensorState = await sensorState()
    debug('initial sensor state', initialSensorState)

    doorAccessory.getService(Service.GarageDoorOpener)
        .getCharacteristic(Characteristic.CurrentDoorState)
        .on('get', (callback) => {
            let err = null

            if (doorController.isDoorClosed()) {
                callback(err, Characteristic.CurrentDoorState.OPEN)
            } else {
                callback(err, Characteristic.CurrentDoorState.CLOSED)
            }
        })

    doorAccessory
        .addService(Service.GarageDoorOpener, 'Garage Door')
        .getCharacteristic(Characteristic.TargetDoorState)
        .on('set', async function(value, callback) {
            let sensorState
            let currentDoorState = getCurrentDoorState()
            // current retrieved door state is "Open"
            if (value === Characteristic.TargetDoorState.CLOSED) {
                if (currentDoorState === Characteristic.CurrentDoorState.OPEN || currentDoorState === Characteristic.CurrentDoorState.STOPPED) {
                    if (!doorController.isDoorClosed()) {
                        await doorController.closeDoor()
                        callback()

                        setDoorCharacteristicClosing()
                        await sleep(config.door.accessory.timeout * 1000)
                        sensorState = doorSensorState()
                        if (sensorState === Characteristic.CurrentDoorState.CLOSED) {
                            setDoorCharacteristicClosed()
                        } else {
                            setDoorCharacteristicStopped()
                        }
                    } else {
                        setDoorCharacteristicClosed()
                        callback()
                    }
                } else {
                    callback()
                }
            } else if (value === Characteristic.TargetDoorState.OPEN) {
                if (currentDoorState === Characteristic.CurrentDoorState.CLOSED) {
                    if (doorController.isDoorClosed()) {
                        await doorController.openDoor()
                        callback()

                        setDoorCharacteristicOpening()
                        await sleep(config.door.accessory.timeout * 1000)
                        sensorState = doorSensorState()
                        if (sensorState === Characteristic.CurrentDoorState.OPEN) {
                            setDoorCharacteristicOpen()
                        } else {
                            setDoorCharacteristicClosed()
                        }
                    } else {
                        setDoorCharacteristicOpen()
                        callback()
                    }
                } else {
                    callback()
                }
            }
        })

    // Camera Accessory

    cameraAccessory.configureCameraSource(cameraSource);

    cameraAccessory.identify, (paired, callback) => {
        callback();
    }

    doorAccessory.publish({
        port: config.door.accessory.port,
        username: config.door.accessory.username,
        pincode: config.door.accessory.pincode,
        category: Accessory.Categories.GARAGE_DOOR_OPENER,
    })

    cameraAccessory.publish({
        port: config.camera.accessory.port,
        username: config.camera.accessory.username,
        pincode: config.camera.accessory.pincode,
        category: Accessory.Categories.CAMERA,
    });
}

function doorSensorState() {
    return doorController.isDoorClosed() ? Characteristic.CurrentDoorState.CLOSED : Characteristic.CurrentDoorState.OPEN
}

function getCurrentDoorState() {
    return doorAccessory.getService(Service.GarageDoorOpener).getCharacteristic(Characteristic.CurrentDoorState)
}

function setDoorCharacteristicClosed() {
    doorAccessory.getService(Service.GarageDoorOpener).setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED)
}

function setDoorCharacteristicClosing() {
    doorAccessory.getService(Service.GarageDoorOpener).setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING)
}

function setDoorCharacteristicOpen() {
    doorAccessory.getService(Service.GarageDoorOpener).setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN)
}

function setDoorCharacteristicOpening() {
    doorAccessory.getService(Service.GarageDoorOpener).setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING)
}

function setDoorCharacteristicStopped() {
    doorAccessory.getService(Service.GarageDoorOpener).setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.STOPPED)
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

controller()