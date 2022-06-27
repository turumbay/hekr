import events from "events";
import net from 'net';
import * as messages from './messages'

interface HekrMessage {
    msgId: number
    action: string
}


class MeterConnection extends events.EventEmitter {
    constructor(public id: number, public sendMessage: (message: HekrMessage) => void) {
        super()
    }
}

namespace fp {
    export interface Maybe<T> {
        map<S>(f: (value: T) => S): Maybe<S>
        filter(predicate: (value: T) => boolean): Maybe<T>
        getOrElse(value: T): T
        isEmpty: boolean
    }

    export class Some<T> implements Maybe<T>{
        isEmpty = false

        map<S>(f: (value: T) => S): Maybe<S> {
            return new Some(f(this.value))
        }

        filter(predicate: (value: T) => boolean): Maybe<T> {
            return predicate(this.value) ? this : new None
        }

        getOrElse(_value: T): T {
            return this.value
        }

        constructor(public value: T) { }


    }

    export class None<T> implements Maybe<T>{
        isEmpty = true

        filter(_predicate: (value: T) => boolean): Maybe<T> {
            return this
        }
        map<S>(_f: (value: T) => S): Maybe<S> {
            return new None<S>()
        }

        getOrElse(value: T): T {
            return value
        }
    }
}


class Meter extends events.EventEmitter {

    connection: fp.Maybe<MeterConnection>


    constructor(public id: string, public updateInterval: number, public ctrlKey: string, public bindKey: string, public license: string = "") {
        super()
        this.connection = new fp.None
    }


    public setConnected(connection: MeterConnection) {
        this.connection = new fp.Some(connection)

        const interval = setInterval(() => {
            const message: HekrMessage = (() => ({
                msgId: Math.round(Date.now() / 1000) % 100000,
                action: "appSend",
                params: {
                    devTid: this.id,
                    ctrlKey: this.ctrlKey,
                    appTid: "25fa78bd-d78c-4b30-9e54-b9669b72e832",
                    data: {
                        raw: "480602350a8f"
                    }
                }
            }))()
            connection.sendMessage(message)
        }, this.updateInterval * 1000)

        const setDisconneced = () => {
            this.connection = new fp.None
            clearInterval(interval)
        }

        connection.on("close", setDisconneced)
        connection.on("error", setDisconneced)

        this.emit("connected", this.id)
    }


    public onRequest: (request: HekrMessage) => HekrMessage = (request) => {
        switch (request.action) {
            case 'devLogin':
                this.license = (<messages.DevLoginMessage>request).params.license
                return {
                    msgId: request.msgId,
                    action: "devLoginResp",
                    code: 200,
                    desc: "success",
                    params: {
                        devTid: this.id,
                        token: null,
                        ctrlKey: this.ctrlKey,
                        bindKey: this.bindKey,
                        forceBind: false,
                        bind: true,
                        license: this.license
                    }
                }
            case 'getTimerList':
                return {
                    msgId: request.msgId,
                    action: "getTimerListResp",
                    code: 200,
                    desc: "success",
                    params: {
                        tasksCount: 0,
                        taskList: []
                    }
                }
            case 'devSend':
                let req = <messages.DevSendMessage>request
                if (req.params.data.raw.length == 134) {
                    const details = this.parseDevSend(req.params.data.raw);
                    this.emit("data", {
                        device_id: req.params.devTid,
                        current: details.current_1,
                        voltage: details.voltage_1,
                        total_active_power: details.total_active_power,
                        total_reactive_power: details.total_reactive_power,
                        total_energy_consumed: details.total_energy_consumed
                    })
                }
                return this.ok(request)
            case 'heartbeat':
                return this.ok(request)
            case 'reportDevInfo':
                return this.ok(request)
            default:
                return this.ok(request)
        }
    }


    private ok: (request: HekrMessage) => HekrMessage = (request) => ({
        msgId: request.msgId,
        action: request.action + "Resp",
        code: 200,
        desc: "success"
    })

    private parseDevSend = (rawData: string) => {

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


interface Meters {
    [index: string]: Meter
}


class Model extends events.EventEmitter {
    private meters: Meters = {}

    constructor(config: Config) {
        super()
        for (let id in config.meters) {
            this.meters[id] = new Meter(id, config.updateInterval, config.meters[id].ctrlKey, config.meters[id].bindKey)
            this.meters[id].on("data", (data) => this.emit("data", data))
            this.meters[id].on("connected", (id) => this.emit("deviceConnected", id))
            this.meters[id].on("disconnected", (id) => this.emit("deviceDisconnected", id))
        }
    }


    public onRequest: (request: HekrMessage, connection: MeterConnection) => HekrMessage = (request, connection) => {
        console.debug("request recieved", request)
        if (request.action == 'devLogin') {
            const meterId: string = (request as messages.DevLoginMessage).params.devTid
            const meter = this.meters[meterId]
            meter.setConnected(connection)
        }
        return this.findMeter(connection).map(meter => meter.onRequest(request)).getOrElse(request)
    }

    private findMeter(connection: MeterConnection): fp.Maybe<Meter> {
        for (let id in this.meters) {
            const candidate = this.meters[id].connection.filter(conn => conn.id == connection.id)
            if (!candidate.isEmpty) return new fp.Some(this.meters[id])
        }
        return new fp.None()
    }

}


const createController = (model: Model) => (socket: net.Socket) => {
    addConsoleLogging(socket, "Dispatcher")

    const connection = new MeterConnection(Date.now(), (response: HekrMessage) => {
        socket.write(JSON.stringify(response))
        socket.write("\n")
    })

    socket.on('connect', () => connection.emit("connected"))

    socket.on('data', (data) => {
        const request: HekrMessage = JSON.parse(data.toString())
        const response: HekrMessage = model.onRequest(request, connection)
        connection.sendMessage(response)
    })

    socket.on('close', () => connection.emit("closed"))

    socket.on('error', (_err) => connection.emit("error"))
}


const createBalancer = (config: Config) => (socket: net.Socket) => {
    addConsoleLogging(socket, "Balancer")

    socket.on('data', (data) => {
        const request: HekrMessage = JSON.parse(data.toString())
        socket.write(JSON.stringify({
            msgId: request.msgId,
            dcInfo: {
                dc: config.dc,
                area: config.area,
                domain: config.domain,
                fromArea: config.area,
                fromDC: config.dc
            },
            action: "getProdInfoResp",
            code: 200,
            desc: "success",
            params: {
                mid: "xxx-mid",
                workMode: 0,
                tokenType: 2,
                serviceHost: config.serviceHost,
                servicePort: config.servicePort,
                encryptType: "None",
                connectType: "tcp"
            }
        }))
        socket.write("\n")
    })
}


function addConsoleLogging(socket: net.Socket, name: string) {
    //socket.setEncoding('utf8')
    socket.on('connect', () => console.debug(name + ": client connected"))
    socket.on('data', (data) => console.debug(name + ': client send message ', data.toString()))
    socket.on('close', () => console.debug(name + ': client disconnected'))
    socket.on('error', (err) => console.error(": error occurred ", err))
}


export interface Config {
    dc: string
    area: string
    domain: string
    serviceHost: string
    servicePort: number

    balancerPort: number

    dispatcherPort: number
    updateInterval: number
    meters: Meters
}


export interface MeterData {
    device_id: string,
    voltage: number,
    total_active_power: number,
    total_reactive_power: number,
    current: number,
    total_energy_consumed: number
}


export declare interface Server {
    on(event: 'data', listener: (data: MeterData) => void): this;
    on(event: 'deviceConnected', listener: (device_id: string) => void): this;
    on(event: 'deviceDisconnected', listener: (device_id: string) => void): this;
}


export class Server extends events.EventEmitter {
    constructor(config: Config) {
        super()

        const balancer = createBalancer(config)
        net.createServer(balancer)
            .listen(config.balancerPort || 9092, () => console.log('Balancer bound'))
            .on('error', (err) => console.error("Something goes wrong in balancer", err));


        const model = new Model(config)
        model.on("deviceConnected", (device_id) => this.emit("deviceConnected", device_id))
        model.on("deviceDisconnected", (device_id) => this.emit("deviceDisconnected", device_id))
        model.on('data', (data) => this.emit("data", data))

        const controller = createController(model)
        net.createServer(controller)
           .listen(config.dispatcherPort || 9091, () => console.log('Dispatcher bound'))
           .on('error', (err) => console.error("Something goes wrong in dispatcher", err))
    }
}