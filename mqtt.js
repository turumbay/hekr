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

function publishConfig(){
	client.publish("hekr/state", "online");
	function sensorConfig(deviceClass, uom){
		return {
		  "availability": [
		    {
		      "topic": "hekr/state"
		    }
		  ],
		  "device": {
		    "identifiers": [
		      config.deviceId
		    ],
		    "manufacturer": "Wisen",
		    "model": "Smart Meter",
		    "name": config.deviceId,
		    "sw_version": "HZ"
		  },
		  "device_class": deviceClass,
		  "json_attributes_topic": "hekr/" + config.deviceId,
		  "name": config.deviceId + "  " + deviceClass,
		  "state_topic": "hekr/" + config.deviceId,
		  "unique_id": "hekr/" + config.deviceId + "_" + deviceClass,
		  "unit_of_measurement": uom,
		  "value_template": "{{ value_json." + deviceClass + " }}"
		}
	}
	client.publish("homeassistant/sensor/" + config.deviceId + "/voltage/config", JSON.stringify(sensorConfig("voltage", "V")));
	client.publish("homeassistant/sensor/" + config.deviceId + "/power/config", JSON.stringify(sensorConfig("power", "kW")));
	client.publish("homeassistant/sensor/" + config.deviceId + "/current/config", JSON.stringify(sensorConfig("current", "A")));		
	client.publish("homeassistant/sensor/" + config.deviceId + "/energy/config", JSON.stringify(sensorConfig("energy", "kWh")));		

}

function publishVoltage(data){
	client.publish("hekr/" + config.deviceId, JSON.stringify({
		"voltage": Math.round(data.voltage_1 * 10) / 10, 
		"power": Math.round(data.total_active_power*100)/100,
		"current": Math.round(data.current_1 * 10) / 10,
		"energy": Math.round(data.total_energy_consumed * 10) / 10 
	}));

}


module.exports = function() {
	return {
		"publishVoltage": publishVoltage,
		"publishConfig": publishConfig
	}
}
