import assert from 'assert/strict';
import net from 'net';
import events from 'events';

// https://docs.hekr.me/v4/%E4%BA%91%E7%AB%AFAPI/%E8%AE%BE%E5%A4%87%E9%80%9A%E4%BF%A1/

interface HekrMessage{
	msgId: number,
	action: string,
	params?: any
}

namespace Requests{
	export interface DevLogin extends HekrMessage{
		action: "devLogin";
		params: {
		  license: string; // "30bc52f9c8fc4eada019bfffb956226c",
		  devTid: string; // "ESP_2M_F4CFA2492863",
		  prodKey: string; // "ccdfab3420b5f0320674f34657882e9e"
		}
	}

	export interface ReportDevInfo extends HekrMessage{
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

	  export interface TimerList extends HekrMessage{
		action: "getTimerList",
		params: {
		  devTid: string //"ESP_2M_F4CFA2492863",
		  taskFormat: string // "single",
		  timeFormat: string // "countdown"
		}
	  }

	  export interface HeartBeat extends HekrMessage{
		action: "heartbeat",
		rssi: string // "-42"
	  }

	  export interface DevSend extends HekrMessage{
		action: "devSend",
		params: {
			devTid: string // "ESP_2M_F4CFA2492863",
			appTid: Array<string> // [],
			data: {
				raw: string // "484301010B001FC9000000000000096800000000000000000000000000000000004C93004C9300000000000003E803E80000000013870000510F0000510F00000000DF"
			}
		}	
	}
}

let getDeviceId = (msgObj:HekrMessage) => msgObj.params.devTid;

interface HekrMeterConfig{
	[index: string]: {
		ctrlKey: string;
		bindKey: string;
		license: string;
	};
}

export interface Config{
	dispatcherPort: number;
	updateInterval: number;
	meters: HekrMeterConfig;
}

export interface HekrMeterData{
	device_id: string,
	voltage: number,
	total_active_power: number,
	total_reactive_power: number,
	current: number,
	total_energy_consumed: number
}

export declare interface Dispatcher{
	on(event: 'data', listener: (data: HekrMeterData) => void): this;	
	on(event: 'deviceConnected', listener: (device_id: string) => void): this;	
}

export class Dispatcher extends events.EventEmitter{
	
	constructor(private config:Config){
		super();

		const server = net.createServer((socket) => {
			console.debug('client connected to dispatcher');
	
			var scheduler:NodeJS.Timer;
			socket.once('data', (data) => {
				let msgObj = JSON.parse(data.toString());
				assert.equal(msgObj.action, "devLogin", `Initial message to dispatcher should be <devLogin>, but received <${msgObj.action}>`);
	
				let deviceId = getDeviceId(msgObj);
	
				function appSendRequest(){
					socket.write(JSON.stringify({
						"msgId": Math.round(Date.now() / 1000)  % 100000 ,
						"action": "appSend",
						"params": {
							"devTid": deviceId,
							"ctrlKey": config.meters[deviceId].ctrlKey,
							"appTid": "25fa78bd-d78c-4b30-9e54-b9669b72e832",
							"data": {
								"raw": "480602350a8f"
							}
						}
					}) + "\n")
				}
				scheduler = setInterval(appSendRequest, config.updateInterval * 1000);				
				
			})
		
			socket.on('data', (data) => {
				console.debug("Dispatcher received request", data);
	
				let request:HekrMessage = JSON.parse(data.toString());
				let action = request.action
				var response:HekrMessage;
				if (action == "devLogin"){
					response = this.onDevLogin(request as Requests.DevLogin)
				}else if (action == "reportDevInfo"){
					response = this.onReportDevInfo(request as Requests.ReportDevInfo)
				}else if (action == "getTimerList"){
					response = this.onGetTimerList(request as Requests.TimerList)
				}else if (action == "heartbeat"){
					response = this.onHeartbeat(request as Requests.HeartBeat)
				}else if (action == "devSend"){
					response = this.onDevSend(request as Requests.DevSend)
				}else{
					response = this.ok(request)
				}
	
				socket.write(JSON.stringify(response) + "\n"); 
			});
	
			socket.on('end', () => {
				clearInterval(scheduler);
				console.debug('client disconnected from dispatcher');
			});
	
			socket.on('error', (err) => {
				console.error("Error occurred in dispatcher: ", err)
			});		

			socket.setEncoding('utf8');
	
		});

		server.listen(config.dispatcherPort || 9091 , () => {
			console.log('dispatcher bound');
		});
		
		server.on('error', (err) => {
			console.error("Something goes wrong in dispatcher", err);
		});
	
	}

	private onDevLogin(request:Requests.DevLogin){
		let deviceId:string = getDeviceId(request);
		this.emit("deviceConnected", deviceId);
		
		return {
			msgId: request.msgId,
			action: "devLoginResp",
			code: 200,
			desc: "success",
			params: {
				devTid: deviceId,
				token: null,
				ctrlKey: this.config.meters[deviceId].ctrlKey,
				bindKey: this.config.meters[deviceId].bindKey,
				forceBind: false,
				bind: true,
				license: this.config.meters[deviceId].license
			}
		}
	}

	private onDevSend(request:Requests.DevSend){

		if (request.params.data.raw.length == 134){
			const details = this.parseDevSend(request.params.data.raw);
			console.debug(details);
			let meterData:HekrMeterData = {
				device_id: getDeviceId(request),
				current: details.current_1,
				voltage: details.voltage_1,
				total_active_power: details.total_active_power,
				total_reactive_power: details.total_reactive_power,
				total_energy_consumed: details.total_energy_consumed
			}
			this.emit("data", meterData)
		}
		return this.ok(request)		
	}
	
	private parseDevSend(rawData:string){

		let pos = 0;
	
		const next = function(n:number, factor:number){
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
			total_reactive_power: next(6,0.0001),
			reactive_power_1: next(6,0.0001),
			reactive_power_2: next(6,0.0001),
			reactive_power_3: next(6,0.0001),
			total_active_power: next(6,0.0001),
			active_power_1: next(6,0.0001),
			active_power_2: next(6,0.0001),
			active_power_3: next(6,0.0001),
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


	private onHeartbeat = (request:Requests.HeartBeat) => this.ok(request)


	private onReportDevInfo = (request:Requests.ReportDevInfo) => this.ok(request)
	

	private onGetTimerList = (request:Requests.TimerList) => ({
		"msgId": request.msgId,
		"action": "getTimerListResp",
		"code": 200,
		"desc": "success",
		"params": {
			"tasksCount": 0,
			"taskList": []
		}
	})


	private ok = (request:HekrMessage) => ({
		msgId: request.msgId,
		action: request.action + "Resp",
		code: 200,
		desc: "success"
	})
}
