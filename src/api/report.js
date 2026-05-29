import request from './request'
export const getInReport = params => request.get('/reports/in', { params })
export const getOutReport = params => request.get('/reports/out', { params })
export const getInventorySummary = params => request.get('/reports/inventory', { params })
