import request from './request'
export const getInOrders = params => request.get('/in-orders', { params })
export const getInOrder = id => request.get(`/in-orders/${id}`)
export const createInOrder = data => request.post('/in-orders', data)
export const confirmInOrder = (id, items) => request.post(`/in-orders/${id}/confirm`, items)
export const getInOrderItems = id => request.get(`/in-orders/${id}/items`)
export const deleteInOrder = id => request.delete(`/in-orders/${id}`)
export const updateInOrder = (id, data) => request.put(`/in-orders/${id}`, data)
