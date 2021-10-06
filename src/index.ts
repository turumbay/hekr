import * as fs from 'fs';
import * as yaml from 'yaml';

const config = (function(){
  const file = fs.readFileSync('./config.yaml', 'utf8');
  return yaml.parse(file);
})();

import hekr from './hekr_services/index'


const balancer = new hekr.HekrBalancer(config)

const dispatcher = new hekr.HekrDispatcher(config)

import {MqttHassPublisher} from './mqtt'
const mqtt = new MqttHassPublisher(config)
dispatcher.on("deviceConnected", (device_id) => mqtt.publishConfig(device_id))
dispatcher.on('data', (data) => mqtt.publishVoltage(data))


