import assert from 'assert/strict';
import net from 'net'

// https://docs.hekr.me/v4/%E4%BA%91%E7%AB%AFAPI/%E8%AE%BE%E5%A4%87%E9%80%9A%E4%BF%A1/


export class HekrBalancer {
	constructor(config: any) {

		const server = net.createServer((socket) => {
			console.debug('client connected to balancer...');

			socket.setEncoding('utf8');

			socket.on('end', () => {
				console.debug('client disconnected from balancer');
			});


			socket.on('error', (err) => {
				console.error("Error occurred in balancer: ", err)
			});


			socket.on('data', (data) => {
				/*{
					"msgId": 18747,
					"action": "getProdInfo",
					"params": {
						"devTid": "ESP_2M_F4CFA2492863",
						"prodKey": "ccdfab3420b5f0320674f34657882e9e",
						"supportSSL": 1
					}}*/
				console.debug("Balancer received request", data);
				let msgObj = JSON.parse(data.toString());
				assert.equal(msgObj.action, "getProdInfo", `Only <getProdInfo> message allowed, but received <${msgObj.action}>`);

				socket.write(JSON.stringify({
					"msgId": msgObj.msgId,
					"dcInfo": {
						"dc": config.dc,
						"area": config.area,
						"domain": config.domain,
						"fromArea": config.area,
						"fromDC": config.dc
					},
					"action": "getProdInfoResp",
					"code": 200,
					"desc": "success",
					"params": {
						"mid": "xxx-mid",
						"workMode": 0,
						"tokenType": 2,
						"serviceHost": config.serviceHost,
						"servicePort": config.servicePort,
						"encryptType": "None",
						"connectType": "tcp"
					}
				}) + "\n");
			})
		});

		server.listen(config.balancerPort || 9092, () => {
			console.log('balancer bound');
		});
		server.on('error', (err) => {
			console.error("Something goes wrong in balancer", err);
		});
	}
}


