import * as fs from 'fs';
import * as yaml from 'yaml';
import * as mqtt from './mqtt'
import * as hekr2 from './hekr/hekr'

const config:hekr2.Config & mqtt.Config & {hideConsoleDebugMessages: boolean}= (function(){
  const file = fs.readFileSync('./config.yaml', 'utf8');
  return yaml.parse(file);
})();

if (config.hideConsoleDebugMessages){
  console.debug = function(){}
}

const publisher = new mqtt.HassPublisher(config)

const server = new hekr2.Server(config)
server.on("deviceConnected", (device_id) => publisher.publishConfig(device_id))
server.on('data', (data) => publisher.publishVoltage(data))

