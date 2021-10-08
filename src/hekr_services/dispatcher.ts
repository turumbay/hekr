import assert from 'assert/strict';
import net from 'net';
import events from 'events';


// https://docs.hekr.me/v4/%E4%BA%91%E7%AB%AFAPI/%E8%AE%BE%E5%A4%87%E9%80%9A%E4%BF%A1/

interface HekrMessage {
	msgId: number,
	action: string,
	params?: any
}

namespace Requests {

	export namespace devLogin {
		export interface Request extends HekrMessage {
			action: "devLogin";
			params: {
				license: string; // "30bc52f9c8fc4eada019bfffb956226c",
				devTid: string; // "ESP_2M_F4CFA2492863",
				prodKey: string; // "ccdfab3420b5f0320674f34657882e9e"
			}
		}

		export const handle = (request: Request, config: Config, emitter: events.EventEmitter) => {
			let deviceId = request.params.devTid;
			emitter.emit("deviceConnected", deviceId);

			let meter = config.meters[deviceId];
			return {
				msgId: request.msgId,
				action: "devLoginResp",
				code: 200,
				desc: "success",
				params: {
					devTid: deviceId,
					token: null,
					ctrlKey: meter.ctrlKey,
					bindKey: meter.bindKey,
					forceBind: false,
					bind: true,
					license: meter.license
				}
			}
		}

		export const createMeterRequest = (request: Request, config: Config) => ({
			"msgId": Math.round(Date.now() / 1000) % 100000,
			"action": "appSend",
			"params": {
				"devTid": request.params.devTid,
				"ctrlKey": config.meters[request.params.devTid].ctrlKey,
				"appTid": "25fa78bd-d78c-4b30-9e54-b9669b72e832",
				"data": {
					"raw": "480602350a8f"
				}
			}
		})
	}

	export namespace reportDevInfo {
		export interface Request extends HekrMessage {
			action: "reportDevInfo"
			params: {
				SSID: string //"golbergs_iot"
				devTid: string // "ESP_2M_F4CFA2492863"
				mid: string // "9Y8iNxWKsHdO"
				workMode: number // 0
				MAC: string // "F4CFA2492863",
				tokenType: number // 1,
				binVer: string //"4.2.6.1",
				binType: string // "A",
				SDKVer: string // "1.2.2",
				SDKMake: number // 0,
				serviceHost: string // "hub.hekreu.me",
				servicePort: number // 83,
				lanIp: string // "192.168.4.10",
				rssi: number // -42,
				mcuVer: string // "",
				features: {
					changeWIFI: {
						status: number //0,
						version: number //1
					}
				},
				forbidOTA: number //0
			}
		}

		export const handle = (request: Request) => ok(request)
	}


	export namespace timerList {
		export interface Request extends HekrMessage {
			action: "getTimerList",
			params: {
				devTid: string //"ESP_2M_F4CFA2492863",
				taskFormat: string // "single",
				timeFormat: string // "countdown"
			}
		}

		export const handle = (request: Request) => ({
			"msgId": request.msgId,
			"action": "getTimerListResp",
			"code": 200,
			"desc": "success",
			"params": {
				"tasksCount": 0,
				"taskList": []
			}
		})
	}


	export namespace heartBeat {
		export interface Request extends HekrMessage {
			action: "heartbeat",
			rssi: string // "-42"
		}

		export const handle = (request: Request) => ok(request)
	}


	export const ok = (request: HekrMessage) => ({
		msgId: request.msgId,
		action: request.action + "Resp",
		code: 200,
		desc: "success"
	})


	export namespace devSend {
		export interface Request extends HekrMessage {
			action: "devSend",
			params: {
				devTid: string // "ESP_2M_F4CFA2492863",
				appTid: Array<string> // [],
				data: {
					raw: string // "484301010B001FC9000000000000096800000000000000000000000000000000004C93004C9300000000000003E803E80000000013870000510F0000510F00000000DF"
				}
			}
		}

		export const handle = (request: Request, emitter: events.EventEmitter) => {
			if (request.params.data.raw.length == 134) {
				const details = parseDevSend(request.params.data.raw);
				console.debug(details);
				emitter.emit("data", {
					device_id: request.params.devTid,
					current: details.current_1,
					voltage: details.voltage_1,
					total_active_power: details.total_active_power,
					total_reactive_power: details.total_reactive_power,
					total_energy_consumed: details.total_energy_consumed
				})
			}
			return Requests.ok(request)
		}

		const parseDevSend = (rawData: string) => {

			let pos = 0;

			const next = function (n: number, factor: number) {
				let result = parseInt('0x' + rawData.substr(pos, n)) * factor;
				pos += n;
				return result
			}

			return {
				hz: next(10, 1),
				current_1: next(6, 0.001),
				current_2: next(6, 0.001),
				current_3: next(6, 0.001),
				voltage_1: next(4, 0.1),
				voltage_2: next(4, 0.1),
				voltage_3: next(4, 0.1),
				total_reactive_power: next(6, 0.0001),
				reactive_power_1: next(6, 0.0001),
				reactive_power_2: next(6, 0.0001),
				reactive_power_3: next(6, 0.0001),
				total_active_power: next(6, 0.0001),
				active_power_1: next(6, 0.0001),
				active_power_2: next(6, 0.0001),
				active_power_3: next(6, 0.0001),
				total_power_factor: next(4, 0.0001),
				power_factor_1: next(4, 0.0001),
				power_factor_2: next(4, 0.0001),
				power_factor_3: next(4, 0.0001),
				current_frequency: next(4, 0.01),
				total_energy_consumed: next(8, 0.01),
				active_energy_import: next(8, 0.01),
				active_energy_export: next(8, 0.01)
			}
		}

	}
}


interface HekrMeterConfig {
	[index: string]: {
		ctrlKey: string;
		bindKey: string;
		license: string;
	};
}

export interface Config {
	dispatcherPort: number;
	updateInterval: number;
	meters: HekrMeterConfig
}


export interface HekrMeterData {
	device_id: string,
	voltage: number,
	total_active_power: number,
	total_reactive_power: number,
	current: number,
	total_energy_consumed: number
}

export declare interface Dispatcher {
	on(event: 'data', listener: (data: HekrMeterData) => void): this;
	on(event: 'deviceConnected', listener: (device_id: string) => void): this;
}

export class Dispatcher extends events.EventEmitter {

	constructor(private config: Config) {
		super();
		const server = net.createServer((socket) => {
			console.debug('client connected to dispatcher');

			var scheduler: NodeJS.Timer;
			socket.once('data', (data) => {
				let request: HekrMessage = JSON.parse(data.toString());
				assert.equal(request.action, "devLogin", `Initial message to dispatcher should be <devLogin>, but received <${request.action}>`);

				let meterRequest = Requests.devLogin.createMeterRequest(request as Requests.devLogin.Request, config)
				const sendMeterRequest = () => socket.write(JSON.stringify(meterRequest) + "\n")
				
				scheduler = setInterval(sendMeterRequest, config.updateInterval * 1000);
			})

			socket.on('data', (data) => {
				console.debug("Dispatcher received request", data);
				let request: HekrMessage = JSON.parse(data.toString());
				let response = this.handleRequest(request)
				socket.write(JSON.stringify(response) + "\n");
			});

			socket.on('end', () => {
				clearInterval(scheduler);
				console.debug('client disconnected from dispatcher');
			}).on('error', (err) => {
				console.error("Error occurred in dispatcher: ", err)
			}).setEncoding('utf8');

		});

		server.listen(config.dispatcherPort || 9091, () => {
			console.log('dispatcher bound');
		});

		server.on('error', (err) => {
			console.error("Something goes wrong in dispatcher", err);
		});

	}

	private handleRequest(request: HekrMessage): HekrMessage {
		switch (request.action) {
			case 'devLogin': return Requests.devLogin.handle(request as Requests.devLogin.Request, this.config, this)
			case 'devSend': return Requests.devSend.handle(request as Requests.devSend.Request, this)
			case 'getTimerList': return Requests.timerList.handle(request as Requests.timerList.Request)
			case 'heartbeat': return Requests.heartBeat.handle(request as Requests.heartBeat.Request)
			case 'reportDevInfo': return Requests.reportDevInfo.handle(request as Requests.reportDevInfo.Request)
			default: return Requests.ok(request)
		}
	}

}
