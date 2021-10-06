import dispatcher from './dispatcher.js'
import balancer from './balancer.js'

const createBalancer = balancer.createBalancer
const createDispatcher = dispatcher.createDispatcher

export default {createBalancer, createDispatcher}
