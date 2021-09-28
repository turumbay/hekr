// https://docs.hekr.me/v4/%E4%BA%91%E7%AB%AFAPI/%E8%AE%BE%E5%A4%87%E9%80%9A%E4%BF%A1/

function onGetProdInfo(data, config){
	/*{
		"msgId": 18747,
		"action": "getProdInfo",
		"params": {
		"devTid": "ESP_2M_F4CFA2492863",
		"prodKey": "ccdfab3420b5f0320674f34657882e9e",
		"supportSSL": 1
	}}*/
	return JSON.stringify({
		"msgId": data.msgId,
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
		}});

}

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
	return JSON.stringify({
	  "msgId": data.msgId,
	  "action": "devLoginResp",
	  "code": 200,
	  "desc": "success",
	  "params": {
	    "devTid": data.params.devTid,
	    "token": null,
	    "ctrlKey": config.ctrlKey,
	    "bindKey": config.bindKey,
	    "forceBind": false,
	    "bind": true,
	    "license": config.license
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
	console.log(mqtt);
	mqtt.publishConfig();

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
			console.log(details);
			mqtt.publishVoltage(details)
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
		result = parseInt('0x' + rawData.substr(pos, n)) * factor;

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


module.exports = function(config, mqtt){
	console.log(config);

	const net = require('net');

	const server = net.createServer((socket) => {
		socket.setEncoding('utf8');

		console.log('client connected');

		let scheduler = setInterval(() => {
			socket.write(JSON.stringify({
			  "msgId": Math.round(Date.now() / 1000)  % 100000 ,
			  "action": "appSend",
			  "params": {
			    "devTid": config.deviceId,
			    "ctrlKey": config.ctrlKey,
			    "appTid": "25fa78bd-d78c-4b30-9e54-b9669b72e832",
			    "data": {
			      "raw": "480602350a8f"
			    }
			  }
			}) + "\n")
		}, config.updateInterval * 1000);


		const router = {
			'getProdInfo': onGetProdInfo,
			'devLogin': onDevLogin,
			'reportDevInfo': onReportDevInfo,
			'getTimerList': onGetTimerList,
			'heartbeat': onHeartbeat,
			'devSend': onDevSend(mqtt)
		}

		socket.on('data', (data) => {
		  console.debug(data);



		  let msgObj = JSON.parse(data);
		  const action = msgObj.action;
		  var response = "";
		  if (router.hasOwnProperty(action)) {
		  	response = router[action](msgObj, config)
		  }
		  socket.write(response); 
		  socket.write("\n");

		});

		socket.on('end', () => {
			clearInterval(scheduler);
		    console.log('client disconnected');
		});



	});


	server.on('error', (err) => {
	  throw err;
	});

	return {server};	
} ;