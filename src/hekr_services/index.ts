import * as dispatcher from './dispatcher'
import * as balancer from './balancer'

const Balancer = balancer.Balancer
const Dispatcher = dispatcher.Dispatcher
type Config = balancer.Config & dispatcher.Config

export {Balancer, Dispatcher, Config}
