import request from './request'
export const getInOrders = params => request.get('/in-orders', { params })
export const createInOrder = data => request.post('/in-orders', data)
export const confirmInOrder = id => request.post(`/in-orders/${id}/confirm`)
export const getInOrderItems = id => request.get(`/in-orders/${id}/items`)
