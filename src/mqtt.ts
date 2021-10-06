import { readFileSync } from 'fs';
import { HekrMeterData } from './hekr_services/dispatcher';


import { connect, MqttClient } from 'mqtt';

export interface MqttConfig{
	mqtt: {
		host: string
		username: string
		password: string
	},
	meters: Array<any>		
}

export class MqttHassPublisher{
	private client: MqttClient
	constructor(config:MqttConfig){
		this.client = connect("mqtt://" + config.mqtt.host,{
			clientId:"hekr-mqtt",
			username: config.mqtt.username,
			password: config.mqtt.password,
			clean:true
		})

		for (let deviceId in config.meters){
			this.publishConfig(deviceId)
		}
	}


	public publishVoltage(data:HekrMeterData){
		this.client.publish("hekr/" + data.device_id, JSON.stringify({
			"voltage": Math.round(data.voltage * 10) / 10, 
			"active_power": Math.round(data.total_active_power*100)/100,
			"reactive_power": Math.round(data.total_reactive_power*100)/100,		
			"current": Math.round(data.current * 10) / 10,
			"energy": Math.round(data.total_energy_consumed * 10) / 10 
		}));
	}

	private publishConfig(deviceId:string){
		this.client.publish("hekr/state", "online");
		function sensorConfig(deviceClass:string, uom:string, deviceName:string){
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
		this.client.publish("homeassistant/sensor/" + deviceId + "/voltage/config", JSON.stringify(sensorConfig("voltage", "V", "voltage")));
		this.client.publish("homeassistant/sensor/" + deviceId + "/active_power/config", JSON.stringify(sensorConfig("power", "kW", "active_power")));
		this.client.publish("homeassistant/sensor/" + deviceId + "/reactive_power/config", JSON.stringify(sensorConfig("power", "kW", "reactive_power")));	
		this.client.publish("homeassistant/sensor/" + deviceId + "/current/config", JSON.stringify(sensorConfig("current", "A", "current")));		
		this.client.publish("homeassistant/sensor/" + deviceId + "/energy/config", JSON.stringify(sensorConfig("energy", "kWh", "energy")));		
	
	}
}
