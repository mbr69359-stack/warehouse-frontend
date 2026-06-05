import request from './request'
export const getLedger = params => request.get('/inventory/ledger', { params })
