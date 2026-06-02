// src/utils/db.js
const DB_NAME = 'warehouse-offline'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('pending_logs')) {
        const store = db.createObjectStore('pending_logs', { keyPath: 'id', autoIncrement: true })
        store.createIndex('status', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' })
      }
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

export async function addPendingLog(entry) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_logs', 'readwrite')
    const req = tx.objectStore('pending_logs').add({
      ...entry,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    })
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

export async function getAllLogs() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_logs', 'readonly')
    const req = tx.objectStore('pending_logs').getAll()
    req.onsuccess = e => resolve(e.target.result.sort((a, b) => b.id - a.id))
    req.onerror = e => reject(e.target.error)
  })
}

export async function updateLogStatus(id, status, rejectReason) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_logs', 'readwrite')
    const store = tx.objectStore('pending_logs')
    const getReq = store.get(id)
    getReq.onsuccess = e => {
      const record = e.target.result
      record.status = status
      if (rejectReason !== undefined) record.rejectReason = rejectReason
      store.put(record)
      tx.oncomplete = resolve
    }
    getReq.onerror = e => reject(e.target.error)
  })
}

export async function deleteLog(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_logs', 'readwrite')
    tx.objectStore('pending_logs').delete(id)
    tx.oncomplete = resolve
    tx.onerror = e => reject(e.target.error)
  })
}

export async function setCache(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').put({ key, value, updatedAt: new Date().toISOString() })
    tx.oncomplete = resolve
    tx.onerror = e => reject(e.target.error)
  })
}

export async function getCache(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly')
    const req = tx.objectStore('cache').get(key)
    req.onsuccess = e => resolve(e.target.result ? e.target.result.value : null)
    req.onerror = e => reject(e.target.error)
  })
}