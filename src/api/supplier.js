import request from './request'
export const getSuppliers = params => request.get('/suppliers', { params })
export const createSupplier = data => request.post('/suppliers', data)
export const updateSupplier = (id, data) => request.put(`/suppliers/${id}`, data)
export const deleteSupplier = id => request.delete(`/suppliers/${id}`)
