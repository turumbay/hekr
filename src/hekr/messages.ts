export interface DevLoginMessage{
    msgId: number
    action: "devLogin";
    params: {
        license: string; // "30bc52f9c8fc4eada019bfffb956226c",
        devTid: string; // "ESP_2M_F4CFA2492863",
        prodKey: string; // "ccdfab3420b5f0320674f34657882e9e"
    }
}

export interface ReportDevInfoMessage{
    msgId: number
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


export interface GetTimerListMessage{
    msgId: number
    action: "getTimerList",
    params: {
        devTid: string //"ESP_2M_F4CFA2492863",
        taskFormat: string // "single",
        timeFormat: string // "countdown"
    }
}


export interface HeartBeatMessage{
    msgId: number
    action: "heartbeat",
    rssi: string // "-42"
}    


export interface DevSendMessage {
    msgId: number
    action: "devSend",
    params: {
        devTid: string // "ESP_2M_F4CFA2492863",
        appTid: Array<string> // [],
        data: {
            raw: string // "484301010B001FC9000000000000096800000000000000000000000000000000004C93004C9300000000000003E803E80000000013870000510F0000510F00000000DF"
        }
    }
}    


