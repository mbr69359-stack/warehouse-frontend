import request from './request'
export const getInventory = params => request.get('/inventory', { params })
export const getAlerts = params => request.get('/inventory/alerts', { params })
export const submitCheck = data => request.post('/inventory/check', data)
export const setAlertQty = data => request.put('/inventory/alert', data)
