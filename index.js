const net = require('net');
const fs = require('fs');
const YAML = require('yaml');


const file = fs.readFileSync('./config.yaml', 'utf8');
const config = YAML.parse(file);

const dispatcher = require('./dispatcher/dispatcher')(config);


dispatcher.server.listen(config.servicePort, () => {
  console.log('server bound');
});
