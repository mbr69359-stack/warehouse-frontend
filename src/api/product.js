import request from './request'
export const getProducts = params => request.get('/products', { params })
export const createProduct = data => request.post('/products', data)
export const updateProduct = (id, data) => request.put(`/products/${id}`, data)
export const deleteProduct = id => request.delete(`/products/${id}`)
export const getProductCostHistory = id => request.get(`/products/${id}/cost-history`)
