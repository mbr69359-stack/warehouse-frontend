import request from './request'
export const getUsers = params => request.get('/sys/users', { params })
export const createUser = data => request.post('/sys/users', data)
export const updateUser = (id, data) => request.put(`/sys/users/${id}`, data)
export const deleteUser = id => request.delete(`/sys/users/${id}`)
export const getRoles = () => request.get('/sys/roles')
export const createRole = data => request.post('/sys/roles', data)
export const updateRole = (id, data) => request.put(`/sys/roles/${id}`, data)
export const deleteRole = id => request.delete(`/sys/roles/${id}`)
