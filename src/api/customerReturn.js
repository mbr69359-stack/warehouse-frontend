import request from './request'
export const getCustomerReturns = params => request.get('/customer-returns', { params })
export const createCustomerReturn = data => request.post('/customer-returns', data)
export const getCustomerReturnItems = id => request.get(`/customer-returns/${id}/items`)
export const getCustomerReturnInOrderItems = id => request.get(`/customer-returns/${id}/in-order-items`)
export const confirmCustomerReturnInbound = (id, items) => request.post(`/customer-returns/${id}/confirm-inbound`, items)
export const confirmCustomerReturn = (id, items) => request.post(`/customer-returns/${id}/confirm`, items)
export const deleteCustomerReturn = id => request.delete(`/customer-returns/${id}`)
