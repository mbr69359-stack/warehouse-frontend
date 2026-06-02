# Offline Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add offline-capable inventory entry and automatic sync to the existing Vue.js warehouse web app.

**Architecture:** When online, operations call the server API directly (existing behaviour unchanged). When offline, quick in/out entries are stored in IndexedDB as `pending_logs`. On network restore, pending logs are pushed to a new `POST /api/sync/batch` endpoint which applies them in chronological order; stock-insufficient entries are rejected and flagged for the user.

**Tech Stack:** Vue 2 + Element UI + IndexedDB (native browser API) + Spring Boot + MyBatis-Plus

---

## File Map

### Backend — new files
| File | Purpose |
|---|---|
| `src/main/java/com/warehouse/dto/SyncItemDTO.java` | Request body item for batch sync |
| `src/main/java/com/warehouse/dto/SyncResultDTO.java` | Per-item sync result |
| `src/main/java/com/warehouse/service/SyncService.java` | Service interface |
| `src/main/java/com/warehouse/service/impl/SyncServiceImpl.java` | Applies items in one transaction |
| `src/main/java/com/warehouse/controller/SyncController.java` | `POST /sync/batch` endpoint |

### Frontend — new files
| File | Purpose |
|---|---|
| `src/utils/db.js` | IndexedDB wrapper (pending_logs + cache stores) |
| `src/utils/sync.js` | Network state observable + sync orchestration |
| `src/api/syncApi.js` | Thin API call for batch sync |
| `src/views/offline/QuickEntry.vue` | Offline-capable quick in/out form |
| `src/views/sync/PendingLogs.vue` | View, retry, and delete pending/rejected entries |

### Frontend — modified files
| File | Change |
|---|---|
| `src/router/index.js` | Add `/quick-entry` and `/sync/pending` routes |
| `src/components/Layout/Header.vue` | Add offline badge + pending count indicator |
| `src/components/Layout/index.vue` | Start network listeners; add drawer links |

---

## Task 1: Backend — DTOs

**Files:**
- Create: `src/main/java/com/warehouse/dto/SyncItemDTO.java`
- Create: `src/main/java/com/warehouse/dto/SyncResultDTO.java`

- [ ] **Step 1: Create SyncItemDTO**

```java
// src/main/java/com/warehouse/dto/SyncItemDTO.java
package com.warehouse.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SyncItemDTO {
    private Long localId;
    private String type;       // "IN" or "OUT"
    private Long warehouseId;
    private Long productId;
    private Integer qty;       // positive = IN, negative = OUT
    private String remark;
    private LocalDateTime createdAt;
}
```

- [ ] **Step 2: Create SyncResultDTO**

```java
// src/main/java/com/warehouse/dto/SyncResultDTO.java
package com.warehouse.dto;

import lombok.Data;

@Data
public class SyncResultDTO {
    private int index;
    private boolean success;
    private String rejectReason;

    public static SyncResultDTO ok(int index) {
        SyncResultDTO r = new SyncResultDTO();
        r.index = index;
        r.success = true;
        return r;
    }

    public static SyncResultDTO fail(int index, String reason) {
        SyncResultDTO r = new SyncResultDTO();
        r.index = index;
        r.success = false;
        r.rejectReason = reason;
        return r;
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/warehouse/dto/SyncItemDTO.java \
        src/main/java/com/warehouse/dto/SyncResultDTO.java
git commit -m "feat: add SyncItemDTO and SyncResultDTO"
```

---

## Task 2: Backend — SyncService + SyncController

**Files:**
- Create: `src/main/java/com/warehouse/service/SyncService.java`
- Create: `src/main/java/com/warehouse/service/impl/SyncServiceImpl.java`
- Create: `src/main/java/com/warehouse/controller/SyncController.java`

- [ ] **Step 1: Create SyncService interface**

```java
// src/main/java/com/warehouse/service/SyncService.java
package com.warehouse.service;

import com.warehouse.dto.SyncItemDTO;
import com.warehouse.dto.SyncResultDTO;
import java.util.List;

public interface SyncService {
    List<SyncResultDTO> batchSync(List<SyncItemDTO> items);
}
```

- [ ] **Step 2: Create SyncServiceImpl**

The entire batch runs in one transaction. Stock-insufficient entries are rejected (not thrown) so the rest of the batch can still commit.

```java
// src/main/java/com/warehouse/service/impl/SyncServiceImpl.java
package com.warehouse.service.impl;

import com.warehouse.dto.SyncItemDTO;
import com.warehouse.dto.SyncResultDTO;
import com.warehouse.entity.Inventory;
import com.warehouse.entity.InventoryLog;
import com.warehouse.mapper.InventoryLogMapper;
import com.warehouse.mapper.InventoryMapper;
import com.warehouse.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SyncServiceImpl implements SyncService {

    private final InventoryMapper inventoryMapper;
    private final InventoryLogMapper inventoryLogMapper;

    @Override
    @Transactional
    public List<SyncResultDTO> batchSync(List<SyncItemDTO> items) {
        items.sort(Comparator.comparing(SyncItemDTO::getCreatedAt,
                Comparator.nullsLast(Comparator.naturalOrder())));

        List<SyncResultDTO> results = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            SyncItemDTO item = items.get(i);
            int absQty = Math.abs(item.getQty());
            boolean isOut = "OUT".equals(item.getType()) || item.getQty() < 0;

            Inventory inv = inventoryMapper.selectForUpdate(item.getWarehouseId(), item.getProductId());
            int beforeQty = inv != null ? inv.getQty() : 0;

            if (isOut && beforeQty < absQty) {
                results.add(SyncResultDTO.fail(i,
                        "库存不足，当前：" + beforeQty + "，需要：" + absQty));
                continue;
            }

            int delta = isOut ? -absQty : absQty;
            if (isOut) {
                inventoryMapper.updateQty(item.getWarehouseId(), item.getProductId(), -absQty);
            } else {
                inventoryMapper.upsertQty(item.getWarehouseId(), item.getProductId(), absQty);
            }

            InventoryLog log = new InventoryLog();
            log.setWarehouseId(item.getWarehouseId());
            log.setProductId(item.getProductId());
            log.setChangeQty(delta);
            log.setBeforeQty(beforeQty);
            log.setAfterQty(beforeQty + delta);
            log.setType(isOut ? "OUT" : "IN");
            log.setRemark(item.getRemark());
            inventoryLogMapper.insert(log);

            results.add(SyncResultDTO.ok(i));
        }
        return results;
    }
}
```

- [ ] **Step 3: Create SyncController**

```java
// src/main/java/com/warehouse/controller/SyncController.java
package com.warehouse.controller;

import com.warehouse.common.Result;
import com.warehouse.dto.SyncItemDTO;
import com.warehouse.dto.SyncResultDTO;
import com.warehouse.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
public class SyncController {
    private final SyncService syncService;

    @PostMapping("/batch")
    public Result<List<SyncResultDTO>> batch(@RequestBody List<SyncItemDTO> items) {
        return Result.success(syncService.batchSync(items));
    }
}
```

- [ ] **Step 4: Build and verify endpoint**

```bash
cd D:\AI\warehouse-backend
mvn spring-boot:run
```

In another terminal:
```bash
curl -s -X POST http://localhost:8080/api/sync/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '[{"type":"IN","warehouseId":1,"productId":1,"qty":1,"createdAt":"2026-06-03T10:00:00"}]'
```

Expected: `{"code":200,"data":[{"index":0,"success":true}]}`

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/warehouse/service/SyncService.java \
        src/main/java/com/warehouse/service/impl/SyncServiceImpl.java \
        src/main/java/com/warehouse/controller/SyncController.java
git commit -m "feat: add POST /sync/batch endpoint for offline sync"
```

---

## Task 3: Frontend — IndexedDB Utility

**Files:**
- Create: `src/utils/db.js`

- [ ] **Step 1: Create src/utils/db.js**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/db.js
git commit -m "feat: add IndexedDB utility for offline storage"
```

---

## Task 4: Frontend — Sync State & Logic

**Files:**
- Create: `src/api/syncApi.js`
- Create: `src/utils/sync.js`

- [ ] **Step 1: Create src/api/syncApi.js**

```javascript
// src/api/syncApi.js
import request from './request'
export const batchSync = items => request.post('/sync/batch', items)
```

- [ ] **Step 2: Create src/utils/sync.js**

```javascript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/api/syncApi.js src/utils/sync.js
git commit -m "feat: add sync state and network listener utilities"
```

---

## Task 5: Frontend — Offline Quick Entry Page

**Files:**
- Create: `src/views/offline/QuickEntry.vue`

- [ ] **Step 1: Create src/views/offline/QuickEntry.vue**

```vue
<!-- src/views/offline/QuickEntry.vue -->
<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>快速出入库</span>
      <el-tag v-if="!online" type="danger" size="mini" style="margin-left:8px;">离线模式</el-tag>
    </div>

    <el-form :model="form" :rules="rules" ref="form" label-width="80px" style="max-width:480px;">
      <el-form-item label="类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio-button label="IN">入库</el-radio-button>
          <el-radio-button label="OUT">出库</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="仓库" prop="warehouseId">
        <el-select v-model="form.warehouseId" placeholder="选择仓库" style="width:100%;">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="商品" prop="productId">
        <el-select v-model="form.productId" placeholder="搜索商品" filterable style="width:100%;">
          <el-option
            v-for="p in products"
            :key="p.id"
            :label="p.name + ' (' + p.skuCode + ')'"
            :value="p.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="数量" prop="qty">
        <el-input-number v-model="form.qty" :min="1" style="width:180px;" />
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>

    <div style="margin-top:20px;">
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ online ? '立即提交' : '暂存（离线）' }}
      </el-button>
      <el-button @click="$router.back()">取消</el-button>
    </div>
  </el-card>
</template>

<script>
import { networkState, syncPendingLogs, refreshCache } from '../../utils/sync'
import { addPendingLog, getCache } from '../../utils/db'
import { batchSync } from '../../api/syncApi'
import { getProducts } from '../../api/product'
import { getWarehouses } from '../../api/warehouse'

export default {
  data() {
    return {
      saving: false,
      warehouses: [],
      products: [],
      form: { type: 'IN', warehouseId: null, productId: null, qty: 1, remark: '' },
      rules: {
        type: [{ required: true }],
        warehouseId: [{ required: true, message: '请选择仓库' }],
        productId: [{ required: true, message: '请选择商品' }],
        qty: [{ required: true, type: 'number', min: 1 }]
      }
    }
  },
  computed: {
    online() { return networkState.online }
  },
  async created() {
    if (this.online) {
      const [p, w] = await Promise.all([
        getProducts({ current: 1, size: 500 }),
        getWarehouses()
      ])
      this.products = p.data.records
      this.warehouses = w.data
      await refreshCache()
    } else {
      const [p, w] = await Promise.all([
        getCache('products'),
        getCache('warehouses')
      ])
      this.products = p || []
      this.warehouses = w || []
    }
  },
  methods: {
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const entry = {
            type: this.form.type,
            warehouseId: this.form.warehouseId,
            productId: this.form.productId,
            qty: this.form.type === 'OUT' ? -Math.abs(this.form.qty) : Math.abs(this.form.qty),
            remark: this.form.remark
          }
          if (this.online) {
            const res = await batchSync([{ ...entry, createdAt: new Date().toISOString() }])
            const result = res.data[0]
            if (result.success) {
              this.$message.success('提交成功')
              this.$router.back()
            } else {
              this.$message.error(result.rejectReason || '提交失败')
            }
          } else {
            await addPendingLog(entry)
            networkState.pendingCount++
            this.$message.success('已暂存，联网后自动同步')
            this.$router.back()
          }
        } finally {
          this.saving = false
        }
      })
    }
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/offline/QuickEntry.vue
git commit -m "feat: add offline quick entry form"
```

---

## Task 6: Frontend — Pending Logs Page

**Files:**
- Create: `src/views/sync/PendingLogs.vue`

- [ ] **Step 1: Create src/views/sync/PendingLogs.vue**

```vue
<!-- src/views/sync/PendingLogs.vue -->
<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>待同步记录</span>
      <el-button
        v-if="online && pendingCount > 0"
        type="primary"
        size="small"
        :loading="syncing"
        @click="doSync"
      >立即同步 ({{ pendingCount }})</el-button>
    </div>

    <el-table :data="logs" v-loading="loading" border stripe>
      <el-table-column label="时间" width="170">
        <template slot-scope="{row}">{{ row.createdAt }}</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template slot-scope="{row}">
          <el-tag :type="row.type === 'IN' ? 'success' : 'danger'" size="mini">
            {{ row.type === 'IN' ? '入库' : '出库' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="仓库" width="120">
        <template slot-scope="{row}">{{ warehouseName(row.warehouseId) }}</template>
      </el-table-column>
      <el-table-column label="商品" min-width="160">
        <template slot-scope="{row}">{{ productName(row.productId) }}</template>
      </el-table-column>
      <el-table-column label="数量" width="90">
        <template slot-scope="{row}">{{ Math.abs(row.qty) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template slot-scope="{row}">
          <el-tag
            :type="row.status === 'SYNCED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'"
            size="mini"
          >{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="拒绝原因" min-width="180">
        <template slot-scope="{row}">
          <span style="color:#f56c6c;font-size:12px;">{{ row.rejectReason }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template slot-scope="{row}">
          <el-button
            v-if="row.status === 'REJECTED'"
            size="mini"
            type="warning"
            @click="retryLog(row)"
          >重试</el-button>
          <el-button
            v-if="row.status !== 'PENDING'"
            size="mini"
            type="danger"
            @click="removeLog(row.id)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import { getAllLogs, updateLogStatus, deleteLog } from '../../utils/db'
import { networkState, syncPendingLogs } from '../../utils/sync'

export default {
  data() {
    return {
      logs: [],
      loading: false,
      syncing: false,
      cachedProducts: [],
      cachedWarehouses: []
    }
  },
  computed: {
    online() { return networkState.online },
    pendingCount() { return networkState.pendingCount }
  },
  async created() {
    const { getCache } = await import('../../utils/db')
    const [p, w] = await Promise.all([getCache('products'), getCache('warehouses')])
    this.cachedProducts = p || []
    this.cachedWarehouses = w || []
    await this.loadLogs()
  },
  methods: {
    async loadLogs() {
      this.loading = true
      try { this.logs = await getAllLogs() }
      finally { this.loading = false }
    },
    statusLabel(s) {
      return { PENDING: '待同步', SYNCED: '已同步', REJECTED: '已拒绝' }[s] || s
    },
    productName(id) {
      const p = this.cachedProducts.find(x => x.id === id)
      return p ? p.name : `ID:${id}`
    },
    warehouseName(id) {
      const w = this.cachedWarehouses.find(x => x.id === id)
      return w ? w.name : `ID:${id}`
    },
    async retryLog(row) {
      await updateLogStatus(row.id, 'PENDING', undefined)
      row.status = 'PENDING'
      row.rejectReason = undefined
      networkState.pendingCount++
      if (this.online) await this.doSync()
    },
    async removeLog(id) {
      await deleteLog(id)
      this.logs = this.logs.filter(l => l.id !== id)
    },
    async doSync() {
      this.syncing = true
      try {
        const { synced, rejected } = await syncPendingLogs()
        this.$message({
          type: rejected > 0 ? 'warning' : 'success',
          message: `${synced} 条成功${rejected > 0 ? `，${rejected} 条失败` : ''}`
        })
        await this.loadLogs()
      } finally {
        this.syncing = false
      }
    }
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/sync/PendingLogs.vue
git commit -m "feat: add pending logs management page"
```

---

## Task 7: Frontend — Wire Up Routes, Header, Layout

**Files:**
- Modify: `src/router/index.js`
- Modify: `src/components/Layout/Header.vue`
- Modify: `src/components/Layout/index.vue`

- [ ] **Step 1: Add routes in src/router/index.js**

In the `children` array (after the last existing route, before the closing `]`), add:

```javascript
{ path: 'quick-entry', component: () => import('../views/offline/QuickEntry.vue') },
{ path: 'sync/pending', component: () => import('../views/sync/PendingLogs.vue') },
```

- [ ] **Step 2: Add offline indicator to src/components/Layout/Header.vue**

Replace the entire `<template>` and `<script>` with:

```vue
<template>
  <div style="width:100%;display:flex;align-items:center;justify-content:space-between;">

    <!-- 移动端头部 -->
    <template v-if="isMobile">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="material-symbols-outlined" style="color:#00288e;font-size:24px;line-height:1;">warehouse</span>
        <span style="font-size:17px;font-weight:700;color:#00288e;letter-spacing:0.01em;font-family:-apple-system,sans-serif;">仓库管理系统</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <el-tag v-if="!online" type="danger" size="mini">离线</el-tag>
        <el-badge v-if="pendingCount > 0" :value="pendingCount" type="warning">
          <el-button size="mini" icon="el-icon-refresh" circle @click="$router.push('/sync/pending')" />
        </el-badge>
      </div>
    </template>

    <!-- 桌面端头部 -->
    <template v-else>
      <i class="el-icon-s-fold" style="font-size:20px;cursor:pointer;color:#606266;" @click="$emit('toggle')" />
      <div style="display:flex;align-items:center;gap:16px;">
        <el-tag v-if="!online" type="danger" size="small">离线模式</el-tag>
        <el-badge v-if="pendingCount > 0" :value="pendingCount" type="warning">
          <el-button size="small" @click="$router.push('/sync/pending')">待同步</el-button>
        </el-badge>
        <el-dropdown @command="handleCommand">
          <span style="cursor:pointer;color:#606266;">
            <i class="el-icon-user-solid"></i> {{ username }}
            <i class="el-icon-arrow-down" style="margin-left:4px;"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="logout" icon="el-icon-switch-button">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </template>

  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { logout } from '../../api/auth'
import { networkState } from '../../utils/sync'
export default {
  props: {
    isMobile: { type: Boolean, default: false }
  },
  computed: {
    ...mapGetters(['username']),
    online() { return networkState.online },
    pendingCount() { return networkState.pendingCount }
  },
  methods: {
    async handleCommand(cmd) {
      if (cmd === 'logout') {
        await logout().catch(() => {})
        this.$store.commit('LOGOUT')
        this.$router.push('/login')
      }
    }
  }
}
</script>
```

- [ ] **Step 3: Wire up network listeners and add drawer links in src/components/Layout/index.vue**

**3a.** Add imports at the top of the `<script>` block. Replace:
```javascript
import { logout } from '../../api/auth'
```
with:
```javascript
import { logout } from '../../api/auth'
import { setupNetworkListeners, refreshPendingCount, refreshCache } from '../../utils/sync'
```

**3b.** In `mounted()`, replace:
```javascript
window.addEventListener('resize', this.onResize)
```
with:
```javascript
window.addEventListener('resize', this.onResize)
setupNetworkListeners()
refreshPendingCount()
if (navigator.onLine) refreshCache().catch(() => {})
```

**3c.** In the mine drawer section, after the `mine-divider` div and before the logout button, add:

```html
<button class="mine-logout-btn" style="color:#409EFF;" @click="goQuickEntry">
  <span class="material-symbols-outlined">bolt</span>
  快速出入库
</button>
<button class="mine-logout-btn" style="color:#E6A23C;" @click="goPendingLogs">
  <span class="material-symbols-outlined">sync</span>
  待同步记录
</button>
```

**3d.** In the `methods` block, add:
```javascript
goQuickEntry() {
  this.showMineSheet = false
  this.$router.push('/quick-entry')
},
goPendingLogs() {
  this.showMineSheet = false
  this.$router.push('/sync/pending')
},
```

- [ ] **Step 4: Commit**

```bash
git add src/router/index.js \
        src/components/Layout/Header.vue \
        src/components/Layout/index.vue
git commit -m "feat: wire up offline indicator, pending badge, quick entry nav"
```

---

## Task 8: Build & Deploy

- [ ] **Step 1: Build frontend**

```bash
cd D:\AI\warehouse-frontend
npm run build
```

Expected: `dist/` folder generated with no errors.

- [ ] **Step 2: Deploy backend to VPS**

```bash
cd D:\AI\warehouse-backend
mvn package -DskipTests
scp -i D:\AI\vps_key target/warehouse-*.jar root@139.84.247.83:/opt/warehouse.jar
ssh -i D:\AI\vps_key root@139.84.247.83 "systemctl restart warehouse.service && systemctl status warehouse.service"
```

Expected: service status shows `active (running)`.

- [ ] **Step 3: Deploy frontend to Vercel**

```bash
cd D:\AI\warehouse-frontend
npx vercel --prod
```

- [ ] **Step 4: Smoke test**

1. Open https://xiaocup.com, log in
2. Header shows no "离线" badge (online)
3. Open DevTools → Network tab → set "Offline"
4. Header shows red "离线" tag
5. Navigate to "快速出入库" (via 我的 → 快速出入库)
6. Select warehouse + product + qty, tap "暂存（离线）" → success toast
7. Navigate to "待同步记录" → entry shows with status "待同步"
8. Remove Offline throttle in DevTools
9. Toast appears: "同步完成：1 条成功"
10. Pending logs page: entry now shows "已同步"
11. Inventory list: qty updated correctly