import { readFileSync } from 'fs';
import yaml from 'yaml';
const file = readFileSync('./config.yaml', 'utf8');
const config = yaml.parse(file);

import { connect } from 'mqtt';

const client = connect("mqtt://" + config.mqtt.host,{
	clientId:"hekr-mqtt",
	username: config.mqtt.username,
	password: config.mqtt.password,
	clean:true
})

function publishConfig(deviceId){
	client.publish("hekr/state", "online");
	function sensorConfig(deviceClass, uom, deviceName){
		return {
			"availability": [
			{
				"topic": "hekr/state"
			}
			],
			"device": {
				"identifiers": [
				deviceId
				],
				"manufacturer": "Wisen",
				"model": "Smart Meter",
				"name": deviceId,
				"sw_version": "HZ"
			},
			"device_class": deviceClass,
			"json_attributes_topic": "hekr/" + deviceId,
			"name": deviceId + "  " + deviceName,
			"state_topic": "hekr/" + deviceId,
			"unique_id": "hekr/" + deviceId + "_" + deviceName,
			"unit_of_measurement": uom,
			"value_template": "{{ value_json." + deviceName + " }}"
		}
	}
	client.publish("homeassistant/sensor/" + deviceId + "/voltage/config", JSON.stringify(sensorConfig("voltage", "V", "voltage")));
	client.publish("homeassistant/sensor/" + deviceId + "/active_power/config", JSON.stringify(sensorConfig("power", "kW", "active_power")));
	client.publish("homeassistant/sensor/" + deviceId + "/reactive_power/config", JSON.stringify(sensorConfig("power", "kW", "reactive_power")));	
	client.publish("homeassistant/sensor/" + deviceId + "/current/config", JSON.stringify(sensorConfig("current", "A", "current")));		
	client.publish("homeassistant/sensor/" + deviceId + "/energy/config", JSON.stringify(sensorConfig("energy", "kWh", "energy")));		

}

function publishVoltage(deviceId, data){
	client.publish("hekr/" + deviceId, JSON.stringify({
		"voltage": Math.round(data.voltage_1 * 10) / 10, 
		"active_power": Math.round(data.total_active_power*100)/100,
		"reactive_power": Math.round(data.total_reactive_power*100)/100,		
		"current": Math.round(data.current_1 * 10) / 10,
		"energy": Math.round(data.total_energy_consumed * 10) / 10 
	}));

}

for (let deviceId in config.devices){
	publishConfig(deviceId)
}

export default {publishVoltage}
