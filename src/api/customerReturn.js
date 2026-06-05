import request from './request'
export const getCustomerReturns = params => request.get('/customer-returns', { params })
export const createCustomerReturn = data => request.post('/customer-returns', data)
export const getCustomerReturnItems = id => request.get(`/customer-returns/${id}/items`)
