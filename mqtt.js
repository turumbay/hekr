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
	client.publish("herk/state", "online");
	client.publish("homeassistant/sensor/" + config.deviceId + "/voltage/config", JSON.stringify({
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
		  "device_class": "voltage",
		  "json_attributes_topic": "hekr/" + config.deviceId,
		  "name": config.deviceId + "  voltage",
		  "state_topic": "hekr/" + config.deviceId,
		  "unique_id": "hekr/" + config.deviceId + "_voltage",
		  "unit_of_measurement": "A",
		  "value_template": "{{ value_json.voltage }}"
		})
	)
}

function publishVoltage(voltage){
	client.publish("hekr/" + config.deviceId, JSON.stringify({"voltage": voltage}));

}

module.exports = function() {
	return {
		publishVoltage: publishVoltage,
		publishConfig: publishConfig
	}
}
