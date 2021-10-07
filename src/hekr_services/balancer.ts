import assert from 'assert/strict';
import net from 'net'

// https://docs.hekr.me/v4/%E4%BA%91%E7%AB%AFAPI/%E8%AE%BE%E5%A4%87%E9%80%9A%E4%BF%A1/

export interface Config {
	balancerPort: number,
	dc: string,
	area: string,
	domain: string,
	serviceHost: string,
	servicePort: number
}

namespace Requests {
	export interface ProdInfoRequest {
		msgId: number, // 18747,
		action: string, // "getProdInfo",
		params: {
			devTid: string, // "ESP_2M_F4CFA2492863",
			prodKey: string, // "ccdfab3420b5f0320674f34657882e9e"
			supportSSL: 0 | 1 // 1
		}
	}
}

export class Balancer {

	constructor(private config: Config) {

		net.createServer(this.createTcpListener)
			.listen(config.balancerPort || 9092, () => {
				console.log('balancer bound');
			}).on('error', (err) => {
				console.error("Something goes wrong in balancer", err);
			});
	}

	private createTcpListener = (socket: net.Socket) => {
		console.debug('client connected to balancer...');

		socket
			.on('data', (data) => {
				console.debug("Balancer received request", data);
				let msgObj = JSON.parse(data.toString());

				assert.equal(msgObj.action, "getProdInfo", `Only <getProdInfo> message allowed, but received <${msgObj.action}>`);
				socket.write(JSON.stringify(this.onGetProdInfo(msgObj)) + "\n");
			})
			.on('end', () => {
				console.debug('client disconnected from balancer');
			})
			.on('error', (err) => {
				console.error("Error occurred in balancer: ", err)
			})
			.setEncoding('utf8')
	}

	private onGetProdInfo = (msgObj: Requests.ProdInfoRequest) => ({
		msgId: msgObj.msgId,
		dcInfo: {
			dc: this.config.dc,
			area: this.config.area,
			domain: this.config.domain,
			fromArea: this.config.area,
			fromDC: this.config.dc
		},
		action: "getProdInfoResp",
		code: 200,
		desc: "success",
		params: {
			mid: "xxx-mid",
			workMode: 0,
			tokenType: 2,
			serviceHost: this.config.serviceHost,
			servicePort: this.config.servicePort,
			encryptType: "None",
			connectType: "tcp"
		}
	})
}


