

import { connect, MqttClient } from 'mqtt';
import { MeterData } from './hekr/hekr';

export interface Config {
	mqtt: {
		host: string
		username: string
		password: string
	}
}

export class HassPublisher {

	protected client: MqttClient

	constructor(config: Config) {
		this.client = connect("mqtt://" + config.mqtt.host, {
			clientId: "hekr-mqtt",
			username: config.mqtt.username,
			password: config.mqtt.password,
			clean: true
		})
		this.client
			.on('connect',    () => console.debug("mqqt client connected"))
			.on('disconnect', () => console.debug("mqqt client disconnected"))
			.on('error',      (err) => console.error("mqqt client error", err))
	}


	public publishVoltage(data: MeterData) {
		console.debug("Publishing data to mqtt", data);
		this.client.publish("hekr/" + data.device_id, JSON.stringify({
			"voltage": Math.round(data.voltage * 10) / 10,
			"active_power": Math.round(data.total_active_power * 100) / 100,
			"reactive_power": Math.round(data.total_reactive_power * 100) / 100,
			"current": Math.round(data.current * 10) / 10,
			"energy": Math.round(data.total_energy_consumed * 10) / 10
		}));
	}

	public publishConfig(deviceId: string) {
		console.debug("Publishing config to mqtt", deviceId);
		
		function sensorConfig(deviceClass: string, uom: string, deviceName: string, stateClass: string = 'measurement') {
			return JSON.stringify({
				"availability": [
					{
						"topic": "hekr/" + deviceId + "/state"
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
				"state_class": stateClass,
				"json_attributes_topic": "hekr/" + deviceId,
				"name": deviceId + "  " + deviceName,
				"state_topic": "hekr/" + deviceId,
				"unique_id": "hekr/" + deviceId + "_" + deviceName,
				"unit_of_measurement": uom,
				"value_template": "{{ value_json." + deviceName + " }}"
			})
		}
		this.client.publish("homeassistant/sensor/" + deviceId + "/voltage/config", sensorConfig("voltage", "V", "voltage"));
		this.client.publish("homeassistant/sensor/" + deviceId + "/active_power/config", sensorConfig("power", "kW", "active_power"));
		this.client.publish("homeassistant/sensor/" + deviceId + "/reactive_power/config", sensorConfig("power", "kW", "reactive_power"));
		this.client.publish("homeassistant/sensor/" + deviceId + "/current/config", sensorConfig("current", "A", "current"));
		this.client.publish("homeassistant/sensor/" + deviceId + "/energy/config", sensorConfig("energy", "kWh", "energy", 'total'));
		
		this.client.publish("hekr/" + deviceId + "/state", "online");
	}
}
