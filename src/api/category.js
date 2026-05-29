import request from './request'
export const getCategories = () => request.get('/categories')
export const createCategory = data => request.post('/categories', data)
export const deleteCategory = id => request.delete(`/categories/${id}`)
