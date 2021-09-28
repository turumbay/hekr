const net = require('net');
const fs = require('fs');
const YAML = require('yaml');


const file = fs.readFileSync('./config.yaml', 'utf8');
const config = YAML.parse(file);



const balancer = require('./hekr_services/balancer')(config)
balancer.listen(config.balancerPort || 9092, () => {
  console.log('balancer bound');
});
balancer.on('error', (err) => {
  throw err;
});


const mqtt = require('./mqtt')();
const dispatcher = require('./hekr_services/dispatcher')(config, mqtt);

dispatcher.listen(config.dispatcherPort || 9091 , () => {
  console.log('dispatcher bound');
});

dispatcher.on('error', (err) => {
  throw err;
});

