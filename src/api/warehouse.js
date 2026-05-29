import request from './request'
export const getWarehouses = () => request.get('/warehouses')
export const createWarehouse = data => request.post('/warehouses', data)
export const updateWarehouse = (id, data) => request.put(`/warehouses/${id}`, data)
export const deleteWarehouse = id => request.delete(`/warehouses/${id}`)
