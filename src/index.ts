import * as fs from 'fs';
import * as yaml from 'yaml';

const config = (function(){
  const file = fs.readFileSync('./config.yaml', 'utf8');
  return yaml.parse(file);
})();

import hekr from './hekr_services/index'
import mqtt from './mqtt'

const balancer = hekr.createBalancer(config)
balancer.listen(config.balancerPort || 9092, () => {
  console.log('balancer bound');
});
balancer.on('error', (err) => {
  console.error("Something goes wrong in balancer", err);
});


const dispatcher = hekr.createDispatcher(config, mqtt);
dispatcher.listen(config.dispatcherPort || 9091 , () => {
  console.log('dispatcher bound');
});

dispatcher.on('error', (err) => {
  console.error("Something goes wrong in dispatcher", err);
});

