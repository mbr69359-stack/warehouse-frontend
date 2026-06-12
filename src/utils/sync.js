// src/utils/sync.js
import Vue from 'vue'
import { getAllLogs, updateLogStatus, setCache, getCache } from './db'
import { batchSync } from '../api/syncApi'
import { getProducts } from '../api/product'
import { getWarehouses } from '../api/warehouse'
import { getInventory } from '../api/inventory'

const INV_SYNC_TIME_KEY = 'inv_sync_time'
const CLIENT_ID_KEY = 'warehouse_sync_client_id'

function createClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
}

export function getSyncClientId() {
  let clientId = localStorage.getItem(CLIENT_ID_KEY)
  if (!clientId) {
    clientId = createClientId()
    localStorage.setItem(CLIENT_ID_KEY, clientId)
  }
  return clientId
}

function mergeInventory(existing, delta) {
  const map = new Map((existing || []).map(item => [`${item.warehouseId}-${item.productId}`, item]))
  for (const item of delta) {
    map.set(`${item.warehouseId}-${item.productId}`, item)
  }
  return Array.from(map.values())
}

export const networkState = Vue.observable({
  online: navigator.onLine,
  pendingCount: 0
})

export async function refreshPendingCount() {
  const logs = await getAllLogs()
  networkState.pendingCount = logs.filter(l => l.status === 'PENDING').length
}

export async function syncPendingLogs() {
  const logs = await getAllLogs()
  const pending = logs.filter(l => l.status === 'PENDING')
  if (!pending.length) return { synced: 0, rejected: 0 }

  const clientId = getSyncClientId()
  const payload = pending.map(({ id, type, warehouseId, productId, qty, remark, createdAt }) => ({
    clientId, localId: id, type, warehouseId, productId, qty, remark, createdAt
  }))

  const res = await batchSync(payload)
  let synced = 0
  let rejected = 0
  const pendingByLocalId = new Map(pending.map(log => [String(log.id), log]))
  const handledLogIds = new Set()
  for (const [fallbackIndex, result] of (res.data || []).entries()) {
    const hasLocalId = result.localId !== undefined && result.localId !== null
    const fallbackResultIndex = result.index !== undefined && result.index !== null ? result.index : fallbackIndex
    const log = hasLocalId ? pendingByLocalId.get(String(result.localId)) : pending[fallbackResultIndex]
    if (!log || handledLogIds.has(log.id)) continue
    handledLogIds.add(log.id)
    if (result.success) {
      await updateLogStatus(log.id, 'SYNCED', undefined)
      synced++
    } else {
      await updateLogStatus(log.id, 'REJECTED', result.rejectReason)
      rejected++
    }
  }
  await refreshPendingCount()
  return { synced, rejected }
}

export async function refreshCache() {
  const syncTime = await getCache(INV_SYNC_TIME_KEY)
  const nowIso = new Date().toISOString().slice(0, 19)

  const invParams = { current: 1, size: 10000 }
  if (syncTime) invParams.updatedAfter = syncTime

  const [products, warehouses, invResp] = await Promise.all([
    getProducts({ current: 1, size: 500 }),
    getWarehouses(),
    getInventory(invParams)
  ])

  const delta = invResp.data.records || invResp.data
  let finalInventory
  if (syncTime) {
    const cached = await getCache('inventory')
    finalInventory = mergeInventory(cached, delta)
  } else {
    finalInventory = delta
  }

  await Promise.all([
    setCache('products', products.data.records),
    setCache('warehouses', warehouses.data),
    setCache('inventory', finalInventory),
    setCache(INV_SYNC_TIME_KEY, nowIso)
  ])
}

export function setupNetworkListeners() {
  const onOnline = async () => {
    networkState.online = true
    try {
      const { synced, rejected } = await syncPendingLogs()
      if (synced > 0 || rejected > 0) {
        Vue.prototype.$message({
          type: rejected > 0 ? 'warning' : 'success',
          message: `同步完成：${synced} 条成功${rejected > 0 ? `，${rejected} 条失败请处理` : ''}`
        })
      }
      await refreshCache()
    } catch (e) {
      console.error('Sync failed', e)
    }
  }
  const onOffline = () => { networkState.online = false }
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
