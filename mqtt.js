const fs = require('fs');
const YAML = require('yaml');
const file = fs.readFileSync('./config.yaml', 'utf8');
const config = YAML.parse(file);

const mqtt = require('mqtt')

const client = mqtt.connect("mqtt://" + config.mqtt.host,{
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
			"value_template": "{{ value_json." + deviceClass + " }}"
		}
	}
	client.publish("homeassistant/sensor/" + deviceId + "/voltage/config", JSON.stringify(sensorConfig("voltage", "V", "voltage")));
	client.publish("homeassistant/sensor/" + deviceId + "/active_power/config", JSON.stringify(sensorConfig("power", "kW", "active power")));
	client.publish("homeassistant/sensor/" + deviceId + "/reactive_power/config", JSON.stringify(sensorConfig("power", "kW", "reactive power")));	
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


module.exports = function() {
	for (deviceId in config.devices){
		publishConfig(deviceId)
	}
	return {
		"publishVoltage": publishVoltage
	}
}
