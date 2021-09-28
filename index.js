const net = require('net');
const fs = require('fs');
const YAML = require('yaml');


const file = fs.readFileSync('./config.yaml', 'utf8');
const config = YAML.parse(file);

const mqtt = require('./mqtt')();
const dispatcher = require('./dispatcher/dispatcher')(config, mqtt);


dispatcher.server.listen(config.internalPort, () => {
  console.log('server bound');
});
