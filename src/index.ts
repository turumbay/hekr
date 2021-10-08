import * as fs from 'fs';
import * as yaml from 'yaml';
import * as hekr from './hekr_services/index'
import * as mqtt from './mqtt'
import * as hekr2 from './hekr2/model'

const config:hekr.Config & mqtt.Config = (function(){
  const file = fs.readFileSync('./config.yaml', 'utf8');
  return yaml.parse(file);
})();
const publisher = new mqtt.HassPublisher(config)

new hekr.Balancer(config)

//const dispatcher = new hekr.Dispatcher(config)
//dispatcher.on("deviceConnected", (device_id) => publisher.publishConfig(device_id))
//dispatcher.on('data', (data) => publisher.publishVoltage(data))

const model = new hekr2.HekrModel()
new hekr2.HekrServer(model)
model.on("deviceConnected", (device_id) => publisher.publishConfig(device_id))
model.on('data', (data) => publisher.publishVoltage(data))

