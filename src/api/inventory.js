import request from './request'
export const getInventory = params => request.get('/inventory', { params })
export const getAlerts = params => request.get('/inventory/alerts', { params })
export const submitCheck = data => request.post('/inventory/check', data)
export const setAlertQty = data => request.put('/inventory/alert', data)
export const getInventoryStats = () => request.get('/inventory/stats')
export const getInventoryChart = params => request.get('/inventory/chart', { params })
export const importInventory = file => {
  const form = new FormData()
  form.append('file', file)
  return request.post('/inventory/import', form)
}
export const downloadImportTemplate = () =>
  request.get('/inventory/import/template', { responseType: 'blob' })
