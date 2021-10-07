import * as fs from 'fs';
import * as yaml from 'yaml';
import * as hekr from './hekr_services/index'
import * as mqtt from './mqtt'

const config:hekr.Config & mqtt.Config = (function(){
  const file = fs.readFileSync('./config.yaml', 'utf8');
  return yaml.parse(file);
})();

new hekr.Balancer(config)

const dispatcher = new hekr.Dispatcher(config)

const publisher = new mqtt.HassPublisher(config)
dispatcher.on("deviceConnected", (device_id) => publisher.publishConfig(device_id))
dispatcher.on('data', (data) => publisher.publishVoltage(data))


