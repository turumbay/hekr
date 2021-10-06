import dispatcher from './dispatcher'
import balancer from './balancer'

const createBalancer = balancer.createBalancer
const createDispatcher = dispatcher.createDispatcher

export default {createBalancer, createDispatcher}
