# 首页图表 + 库存查询图表视图 设计文档

日期：2026-06-02

---

## 1. 需求概述

### 首页（Dashboard）
- 将原"入库单总数"卡片拆分为两张卡片：**库存总数**（所有仓库所有商品 qty 之和）和**最大仓库**（库存总量最多的仓库名称及其 qty 总和）
- 点击这两张卡片，在卡片下方展开对应的柱状图；点击同一张收起，点另一张切换

### 库存查询（inventory/List.vue）
- 右上角新增视图切换按钮：`☰ 列表` ⇄ `📊 图表`
- 图表视图内有两个标签页：
  - **全部库存**：所有仓库合并，按商品展示 qty 总量
  - **按仓库查看**：下拉选择仓库，展示该仓库各商品 qty

---

## 2. 视觉设计

### 柱状图样式（ECharts）
- 每种商品独立颜色（柔和浅色系背景，如 `#dde3ff` 蓝、`#c8f5ec` 绿、`#ffe0d6` 橙、`#f0d9f8` 紫、`#ffe8c2` 黄橙、`#ffd6d6` 红）
- 数量横排显示在柱条内部（ECharts label，position: `'inside'`）
- 数字统一深色 `#2a2d4a`，字体 Nunito 或系统圆润字体，fontWeight: 700
- 低于预警值的商品：柱条变为红色 `#ffd6d6`，商品名标红并加 ⚠
- 柱条顶部圆角（`barBorderRadius: [6, 6, 0, 0]`）

### 切换动画
- ECharts 内置 `animationType: 'scale'`，`animationEasing: 'elasticOut'`，模拟 iOS 弹起效果
- 切换仓库时调用 `chart.setOption()` 触发数据更新动画

---

## 3. 数据来源

### 新增后端接口

| 接口 | 说明 |
|------|------|
| `GET /inventory/stats` | 返回库存总数、最大仓库名称及其总量 |
| `GET /inventory/chart?type=all` | 返回所有商品的 qty 合计（按 productId 聚合） |
| `GET /inventory/chart?type=warehouse&warehouseId=X` | 返回指定仓库各商品 qty |

响应格式示例（`/inventory/chart`）：
```json
{
  "data": [
    { "productId": 1, "productName": "手机", "qty": 420, "alertQty": 50, "isLow": false },
    { "productId": 2, "productName": "耳机", "qty": 18, "alertQty": 30, "isLow": true }
  ]
}
```

### 前端新增 API 方法
- `getInventoryStats()` → `/inventory/stats`
- `getInventoryChart(params)` → `/inventory/chart`

---

## 4. 组件改动

### Dashboard.vue
- 原 `cards` 数组保持不变（移动端仍用 `cards[0]` 入库单数、`cards[1]` 出库单数）
- 新增独立的 `statsData`（对象）：通过 `/inventory/stats` 获取 `{ totalQty, maxWarehouseName, maxWarehouseQty }`
- 桌面端 4 张卡片改为：库存总数（statsData.totalQty）、最大仓库（statsData.maxWarehouseName + maxWarehouseQty）、库存预警（cards[2].value）、库存种类（cards[3].value）；出库单总数卡片从桌面端移除（仍可通过侧边栏访问）
- 新增 `activeChart` 状态（`null | 'total' | 'max'`），点击对应卡片切换
- 卡片下方渲染 `<InventoryBarChart>` 组件（条件渲染，v-if）
- 仅桌面端展示图表展开区域；移动端不变（移动端 cards 引用保持原样）

### inventory/List.vue
- 新增 `viewMode` 状态（`'list' | 'chart'`），工具栏切换
- 新增 `chartTab` 状态（`'all' | 'warehouse'`）
- 图表模式下渲染 `<InventoryBarChart>` 组件，传入数据和仓库选择器

### 新增组件：src/components/InventoryBarChart.vue
- Props：`chartData`（数组）、`title`（字符串）、`warehouses`（仓库列表，按仓库模式用）、`showWarehouseSelect`（布尔）
- 内部用 ECharts 渲染，监听 chartData 变化触发动画更新
- 自动计算颜色数组（按固定调色板循环）
- `isLow` 为 true 的商品柱条强制用红色
- **库存极少时数字可见性**：若柱条高度不足以容纳内部数字（qty 极小导致柱条很矮），label 自动移到柱条顶部外侧显示（ECharts `label.position` 动态判断：qty < 阈值时用 `'top'`，否则用 `'inside'`），字色保持统一深色 `#2a2d4a`

### 后端改动

**InventoryController.java** — 新增两个端点：
1. `GET /inventory/stats` → 调用 `inventoryService.getStats()`
2. `GET /inventory/chart` → 调用 `inventoryService.getChartData(type, warehouseId)`

**InventoryServiceImpl.java** — 新增：
1. `getStats()`：查询 `SUM(qty)` 全局合计 + 按仓库分组找最大仓库
2. `getChartData(type, warehouseId)`：
   - `type=all`：按 productId GROUP BY，SUM(qty)，JOIN product 取名称，JOIN inventory 取 alertQty
   - `type=warehouse`：WHERE warehouseId=X，JOIN product 取名称

**InventoryMapper.java** — 新增两条 `@Select` 注解 SQL

---

## 5. 不在范围内

- 移动端图表（移动端维持现有卡片视图，不加图表）
- 出库单总数卡片保持不变
- 历史趋势图（折线图）

---

## 6. 验收标准

1. 首页点击"库存总数"卡片，下方展开显示各商品总量柱状图，再次点击收起
2. 点击"最大仓库"卡片，图表切换为该仓库的分商品数量
3. 库存查询页右上角可切换列表/图表视图
4. 图表视图内可在"全部库存"和"按仓库"之间切换
5. 按仓库模式下切换仓库时，柱状图平滑弹起动画
6. 低于预警值的商品柱条变红，商品名加 ⚠
7. 数量数字横排居中显示在柱内，统一深色字体