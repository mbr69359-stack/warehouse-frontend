import request from './request'

export function getSysConfigs() {
  return request.get('/sys/config')
}

export function updateSysConfig(key, value) {
  return request.put(`/sys/config/${encodeURIComponent(key)}`, { value })
}