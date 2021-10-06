import assert from 'assert/strict';
import net from 'net'

// https://docs.hekr.me/v4/%E4%BA%91%E7%AB%AFAPI/%E8%AE%BE%E5%A4%87%E9%80%9A%E4%BF%A1/


let getDeviceId = msgObj => msgObj.params.devTid;


function onDevLogin(data, config) {
	/*{
	  "msgId": 0,
	  "action": "devLogin",
	  "params": {
	    "license": "30bc52f9c8fc4eada019bfffb956226c",
	    "devTid": "ESP_2M_F4CFA2492863",
	    "prodKey": "ccdfab3420b5f0320674f34657882e9e"
	  }
	}*/
	let deviceId = getDeviceId(data);
	return JSON.stringify({
		"msgId": data.msgId,
		"action": "devLoginResp",
		"code": 200,
		"desc": "success",
		"params": {
			"devTid": deviceId,
			"token": null,
			"ctrlKey": config.devices[deviceId].ctrlKey,
			"bindKey": config.devices[deviceId].bindKey,
			"forceBind": false,
			"bind": true,
			"license": config.devices[deviceId].license
		}
	})
}


function ok(data){
	return JSON.stringify({
		"msgId": data.msgId,
		"action": data.action + "Resp",
		"code": 200,
		"desc": "success"
	});
}

function onReportDevInfo(data){	
	/*{
	  "msgId": 18453,
	  "action": "reportDevInfo",
	  "params": {
	    "SSID": "golbergs_iot",
	    "devTid": "ESP_2M_F4CFA2492863",
	    "mid": "9Y8iNxWKsHdO",
	    "workMode": 0,
	    "MAC": "F4CFA2492863",
	    "tokenType": 1,
	    "binVer": "4.2.6.1",
	    "binType": "A",
	    "SDKVer": "1.2.2",
	    "SDKMake": 0,
	    "serviceHost": "hub.hekreu.me",
	    "servicePort": 83,
	    "lanIp": "192.168.4.10",
	    "rssi": -42,
	    "mcuVer": "",
	    "features": {
	      "changeWIFI": {
	        "status": 0,
	        "version": 1
	      }
	    },
	    "forbidOTA": 0
	  }
	}*/	
	return ok(data)
}

function onGetTimerList(data){
	/*{
	  "msgId": 18485,
	  "action": "getTimerList",
	  "params": {
	    "devTid": "ESP_2M_F4CFA2492863",
	    "taskFormat": "single",
	    "timeFormat": "countdown"
	  }
	}*/	
	return JSON.stringify({
		"msgId": data.msgId,
		"action": "getTimerListResp",
		"code": 200,
		"desc": "success",
		"params": {
			"tasksCount": 0,
			"taskList": []
		}
	})
}

var onDevSend = function(mqtt){
	return function(data){
		/*{
		  "msgId": 18486,
		  "action": "devSend",
		  "params": {
		    "devTid": "ESP_2M_F4CFA2492863",
		    "appTid": [],
		    "data": {
		      "raw": "484301010B001FC9000000000000096800000000000000000000000000000000004C93004C9300000000000003E803E80000000013870000510F0000510F00000000DF"
		    }
		  }
		}*/	
		if (data.params.data.raw.length == 134){
			const details = parseDevSend(data.params.data.raw);
			console.debug(details);
			mqtt.publishVoltage(getDeviceId(data), details)
		}
		return ok(data)
	}
}



function onHeartbeat(data){
	/*{
	  "msgId": 18513,
	  "action": "heartbeat",
	  "rssi": "-42"
	}*/	
	return ok(data)
}


function parseDevSend(rawData){

	let pos = 0;

	const next = function(n, factor){
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



function createDispatcher(config, mqtt){
	const dispatcher = net.createServer((socket) => {
		console.debug('client connected to dispatcher');

		socket.setEncoding('utf8');

		let scheduler = 0;
		socket.once('data', (data) => {
			let msgObj = JSON.parse(data);
			assert.equal(msgObj.action, "devLogin", `Initial message to dispatcher should be <devLogin>, but received <${msgObj.action}>`);

			let deviceId = getDeviceId(msgObj);

			function appSendRequest(){
				socket.write(JSON.stringify({
					"msgId": Math.round(Date.now() / 1000)  % 100000 ,
					"action": "appSend",
					"params": {
						"devTid": deviceId,
						"ctrlKey": config.devices[deviceId].ctrlKey,
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
			const router = {
				'devLogin': onDevLogin,
				'reportDevInfo': onReportDevInfo,
				'getTimerList': onGetTimerList,
				'heartbeat': onHeartbeat,
				'devSend': onDevSend(mqtt)
			}

			let msgObj = JSON.parse(data);
			var response = "";
			if (router.hasOwnProperty(msgObj.action)) {
				response = router[msgObj.action](msgObj, config)
			}
			socket.write(response); 
			socket.write("\n");
		});

		socket.on('end', () => {
			if (scheduler > 0){ 
				clearInterval(scheduler) 
			};
			console.debug('client disconnected from dispatcher');
		});

		socket.on('error', (err) => {
			console.error("Error occurred in dispatcher: ", err)
		});		

	});

	return dispatcher;	
} ;

export default {createDispatcher}