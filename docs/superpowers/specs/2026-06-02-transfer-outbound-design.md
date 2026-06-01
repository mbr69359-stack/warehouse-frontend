# 调拨出库改造设计文档

**日期：** 2026-06-02  
**状态：** 已批准

## 背景

现有出库单（Create.vue）已支持 SALE / TRANSFER 两种类型，但调拨出库缺少目标仓库字段，且产品下拉不显示库存数量，体验不完整。

## 需求

1. 调拨出库时需选择目标仓库（从哪个仓库调出 → 调入哪个仓库）
2. 产品下拉选项显示当前库存数量，库存为 0 的产品禁用
3. 库存数据基于已选源仓库，切换仓库后自动刷新

## 方案：一次性预加载库存（方案一）

选中源仓库后调一次 `GET /inventory?warehouseId=x&size=500`，结果存入内存 Map，产品选择时直接读 Map，零额外请求。

## 前端改动（Create.vue）

### 新增状态
```js
inventoryMap: {},   // { productId: qty }，选仓库后加载
```

### 交互规则
- 选择源仓库 → 调 `/inventory` 加载 inventoryMap，清空已选明细
- 切换仓库 → 重新加载 inventoryMap，清空明细
- 出库类型切为 TRANSFER → 出现"目标仓库"下拉（必填），排除源仓库选项
- 出库类型切回 SALE → 隐藏目标仓库，清空 targetWarehouseId
- 未选仓库时"添加商品"按钮置灰，提示"请先选择仓库"

### 产品下拉选项格式
```
产品名 (SKU编码) — 库存: 120件   ← 正常可选
产品名 (SKU编码) — 库存: 0件     ← 灰色禁用
```

### 表单字段新增
```js
form: {
  warehouseId: null,
  targetWarehouseId: null,   // 新增，调拨时必填
  type: 'SALE',
  remark: '',
  items: []
}
```

### 校验规则新增
```js
targetWarehouseId: [
  { required: true, message: '请选择目标仓库', trigger: 'change' }
]
// 仅当 type === 'TRANSFER' 时生效（动态 rules）
```

## 后端改动

### 数据库
```sql
ALTER TABLE out_orders
  ADD COLUMN target_warehouse_id BIGINT NULL COMMENT '调拨目标仓库ID，调拨出库时必填';
```

### Java 实体 / DTO
`OutOrder` 实体和请求 DTO 新增字段：
```java
private Long targetWarehouseId;
```

### 接口
- `POST /api/out-orders`：接收 `targetWarehouseId`，写入数据库，其余逻辑不变
- 库存扣减仍从源仓库（`warehouseId`）扣，调拨不自动补入目标仓库（现有逻辑保持）

## 数据流

```
选择源仓库
  → GET /inventory?warehouseId=x&size=500
  → 构建 inventoryMap { productId: qty }

选择"调拨出库"
  → 显示目标仓库下拉（排除源仓库）

添加产品明细
  → 下拉显示"产品名(SKU) — 库存:xxx件"
  → qty=0 的产品禁用

保存草稿
  → POST /out-orders { warehouseId, targetWarehouseId, type, remark, items }
  → 后端写入 out_orders 表
```

## 不在范围内

- 调拨确认后自动增加目标仓库库存（现有确认逻辑不变）
- 调拨单独列表页或独立路由
- 库存实时推送