# 离线同步功能设计文档

**日期：** 2026-06-03  
**项目：** warehouse-frontend + warehouse-backend  
**功能：** PWA 离线缓存 + 出入库流水同步

---

## 背景

现有系统为 Vue.js 网页 + Spring Boot + MySQL，所有操作依赖网络。需要支持断网时仍可进行出入库操作，恢复网络后自动同步，多台设备共用同一份服务端数据。

---

## 架构

```
有网：浏览器 → api.xiaocup.com → MySQL（现有逻辑不变）
断网：浏览器 → IndexedDB（本地暂存）
上线：IndexedDB pending_logs → 批量推送服务端 → 刷新本地缓存
```

网站与服务端共用同一个 MySQL，数据始终以服务端为准。

---

## 本地存储结构（IndexedDB）

### 镜像缓存（只读，从服务端拉取）

| 表名 | 内容 |
|---|---|
| `products` | 商品列表 |
| `warehouses` | 仓库列表 |
| `inventory` | 当前库存快照 |

### 离线流水队列

```
pending_logs
  id            本地自增 ID
  type          IN / OUT
  warehouseId
  productId
  qty           变化量（入库为正，出库为负）
  remark
  createdAt     本地操作时间（用于服务端排序）
  status        PENDING | SYNCED | REJECTED
  rejectReason  服务端拒绝原因
```

---

## 同步流程

### 有网时
1. 出入库操作直接调服务端 API
2. 成功后拉取最新库存，刷新本地镜像缓存

### 断网时
1. 出入库操作写入本地 `pending_logs`（status: PENDING）
2. 界面显示"已暂存，待同步"

### 恢复网络
1. 自动检测网络恢复
2. 按 `createdAt` 顺序逐条推送服务端
3. 成功 → status: SYNCED
4. 失败 → status: REJECTED，记录原因
5. 同步完成后拉取最新库存刷新本地缓存

---

## 冲突处理

**场景：** 多台设备断网期间对同一 SKU 各自出库，合计超出实际库存。

**规则：**
- 服务端按 `createdAt` 时间戳顺序执行
- 先到的成功，后到的若库存不足则拒绝
- 被拒绝的条目在"待同步记录"页面红色标注，显示拒绝原因
- **不自动处理**，必须用户手动确认（修改数量或取消），防止数据静默丢失

---

## 后端改动

新增一个批量同步接口：

```
POST /api/sync/batch
Body: [ { type, warehouseId, productId, qty, remark, createdAt }, ... ]
Response: [ { index, success, rejectReason }, ... ]
```

现有出入库确认逻辑复用，不修改。

---

## 前端改动

| 模块 | 改动 |
|---|---|
| Service Worker | 缓存 App Shell，使页面离线可加载 |
| `src/utils/db.js` | IndexedDB 封装（读写 pending_logs、镜像缓存） |
| `src/utils/sync.js` | 同步逻辑（网络检测、批量推送、冲突处理） |
| 出入库页面 | 有网调 API，断网写本地 |
| 新增"待同步记录"页面 | 展示 PENDING / REJECTED 的流水，支持重试和取消 |

---

## 不在范围内

- 原生 App（iOS/Android）
- 历史数据归档
- 自动解决冲突（一律人工确认）