import request from './request'
export const getLedger = params => request.get('/inventory/ledger', { params })
export const rebuildSnapshot = () => request.post('/inventory/ledger/rebuild')
export const exportLedger = params => request.get('/inventory/ledger/export', { params, responseType: 'blob' })