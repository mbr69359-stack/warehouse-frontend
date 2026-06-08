import request from './request'
export const getOutOrders = params => request.get('/out-orders', { params })
export const getOutOrder = id => request.get(`/out-orders/${id}`)
export const createOutOrder = data => request.post('/out-orders', data)
export const confirmOutOrder = (id, items) => request.post(`/out-orders/${id}/confirm`, items)
export const getOutOrderItems = id => request.get(`/out-orders/${id}/items`)
export const deleteOutOrder = id => request.delete(`/out-orders/${id}`)
export const getDraftOutOrderCount = () =>
  request.get('/out-orders', { params: { current: 1, size: 1, status: 'DRAFT' } })
    .then(r => r.data?.total || 0).catch(() => 0)
