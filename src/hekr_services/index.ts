import dispatcher from './dispatcher'
import * as balancer from './balancer'

const HekrBalancer = balancer.HekrBalancer
const HekrDispatcher = dispatcher.HekrDispatcher

export default {HekrBalancer, HekrDispatcher}
