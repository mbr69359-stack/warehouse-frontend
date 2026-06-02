// src/utils/sync.js
import Vue from 'vue'
import { getAllLogs, updateLogStatus, setCache } from './db'
import { batchSync } from '../api/syncApi'
import { getProducts } from '../api/product'
import { getWarehouses } from '../api/warehouse'
import { getInventory } from '../api/inventory'

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

  const payload = pending.map(({ id, type, warehouseId, productId, qty, remark, createdAt }) => ({
    localId: id, type, warehouseId, productId, qty, remark, createdAt
  }))

  const res = await batchSync(payload)
  let synced = 0
  let rejected = 0
  for (const result of res.data) {
    const log = pending[result.index]
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
  const [products, warehouses, inventory] = await Promise.all([
    getProducts({ current: 1, size: 500 }),
    getWarehouses(),
    getInventory({ current: 1, size: 10000 })
  ])
  await Promise.all([
    setCache('products', products.data.records),
    setCache('warehouses', warehouses.data),
    setCache('inventory', inventory.data.records || inventory.data)
  ])
}

export function setupNetworkListeners() {
  window.addEventListener('online', async () => {
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
  })
  window.addEventListener('offline', () => {
    networkState.online = false
  })
}