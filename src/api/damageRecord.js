import request from './request'
export const getDamageRecords = params => request.get('/damage-records', { params })
export const getPendingDamageRecords = warehouseId => request.get('/damage-records/pending', { params: { warehouseId } })
export const getPendingCount = warehouseId => request.get('/damage-records/pending-count', { params: { warehouseId } })
export const createDamageRecord = data => request.post('/damage-records', data)
export const deleteDamageRecord = id => request.delete(`/damage-records/${id}`)
