import request from './request'
export const getOutOrders = params => request.get('/out-orders', { params })
export const createOutOrder = data => request.post('/out-orders', data)
export const confirmOutOrder = id => request.post(`/out-orders/${id}/confirm`)
export const getOutOrderItems = id => request.get(`/out-orders/${id}/items`)
export const deleteOutOrder = id => request.delete(`/out-orders/${id}`)
