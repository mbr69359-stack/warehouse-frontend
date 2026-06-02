// src/api/syncApi.js
import request from './request'
export const batchSync = items => request.post('/sync/batch', items)
