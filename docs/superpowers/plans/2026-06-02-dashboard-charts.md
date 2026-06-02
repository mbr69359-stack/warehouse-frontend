# 首页图表 + 库存图表视图 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页新增可展开的库存柱状图卡片，在库存查询页新增图表视图，实现仓库/商品维度的库存可视化

**Architecture:** 后端新增 2 个 REST 端点（`/inventory/stats`、`/inventory/chart`）及对应 VO 类、Mapper SQL、Service 方法；前端新建通用 `InventoryBarChart.vue`（ECharts 5），Dashboard.vue 和 inventory/List.vue 分别接入，移动端不受影响

**Tech Stack:** Spring Boot 2.7 + MyBatis Plus 3.5 + MySQL 8（后端）；Vue 2 + Element UI + ECharts 5.4.3（前端）

---

## 文件一览

### 后端（`D:\AI\warehouse-backend`）

| 操作 | 路径 |
|------|------|
| 新建 | `src/main/java/com/warehouse/vo/InventoryStatsVO.java` |
| 新建 | `src/main/java/com/warehouse/vo/InventoryChartItemVO.java` |
| 新建 | `src/test/java/com/warehouse/service/InventoryServiceImplTest.java` |
| 修改 | `src/main/java/com/warehouse/mapper/InventoryMapper.java` |
| 修改 | `src/main/java/com/warehouse/service/InventoryService.java` |
| 修改 | `src/main/java/com/warehouse/service/impl/InventoryServiceImpl.java` |
| 修改 | `src/main/java/com/warehouse/controller/InventoryController.java` |

### 前端（`D:\AI\warehouse-frontend`）

| 操作 | 路径 |
|------|------|
| 修改 | `src/api/inventory.js` |
| 新建 | `src/components/InventoryBarChart.vue` |
| 修改 | `src/views/Dashboard.vue` |
| 修改 | `src/views/inventory/List.vue` |

---

## Task 1：后端 VO 类

**文件：**
- 新建：`src/main/java/com/warehouse/vo/InventoryStatsVO.java`
- 新建：`src/main/java/com/warehouse/vo/InventoryChartItemVO.java`

- [ ] **步骤 1：新建 InventoryStatsVO.java**

```java
package com.warehouse.vo;

import lombok.Data;

@Data
public class InventoryStatsVO {
    private Long totalQty;
    private String maxWarehouseName;
    private Long maxWarehouseQty;
    private Long maxWarehouseId;
}
```

- [ ] **步骤 2：新建 InventoryChartItemVO.java**

`isLow` 不由 SQL 直接设置，由 Service 层在返回前根据 `qty < alertQty` 计算赋值。

```java
package com.warehouse.vo;

import lombok.Data;

@Data
public class InventoryChartItemVO {
    private Long productId;
    private String productName;
    private Integer qty;
    private Integer alertQty;
    private Boolean isLow;
}
```

- [ ] **步骤 3：编译确认**

```bash
cd D:\AI\warehouse-backend
mvn compile -q
```

期望：`BUILD SUCCESS`

- [ ] **步骤 4：提交**

```bash
cd D:\AI\warehouse-backend
git add src/main/java/com/warehouse/vo/
git commit -m "feat: add InventoryStatsVO and InventoryChartItemVO"
```

---

## Task 2：后端 — 编写服务层单元测试（先于实现）

**文件：**
- 新建：`src/test/java/com/warehouse/service/InventoryServiceImplTest.java`

**背景：** `spring-boot-starter-test`（pom.xml 已有）包含 JUnit 5 + Mockito + AssertJ，无需额外依赖。`@Mock` 替换真实 Mapper，不需要数据库连接。

- [ ] **步骤 1：新建测试文件（此时 test-compile 会失败，因为 getStats/getChartData 还不存在）**

```java
package com.warehouse.service;

import com.warehouse.mapper.InventoryLogMapper;
import com.warehouse.mapper.InventoryMapper;
import com.warehouse.service.impl.InventoryServiceImpl;
import com.warehouse.vo.InventoryChartItemVO;
import com.warehouse.vo.InventoryStatsVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceImplTest {

    @Mock
    private InventoryMapper inventoryMapper;

    @Mock
    private InventoryLogMapper inventoryLogMapper;

    @InjectMocks
    private InventoryServiceImpl service;

    @Test
    void getStats_returnsTotalAndMaxWarehouse() {
        when(inventoryMapper.selectTotalQty()).thenReturn(500L);
        InventoryStatsVO maxW = new InventoryStatsVO();
        maxW.setMaxWarehouseName("仓库A");
        maxW.setMaxWarehouseQty(200L);
        maxW.setMaxWarehouseId(3L);
        when(inventoryMapper.selectMaxWarehouse()).thenReturn(maxW);

        InventoryStatsVO result = service.getStats();

        assertThat(result.getTotalQty()).isEqualTo(500L);
        assertThat(result.getMaxWarehouseName()).isEqualTo("仓库A");
        assertThat(result.getMaxWarehouseQty()).isEqualTo(200L);
        assertThat(result.getMaxWarehouseId()).isEqualTo(3L);
    }

    @Test
    void getStats_whenNoData_returnsTotalZero() {
        when(inventoryMapper.selectTotalQty()).thenReturn(null);
        when(inventoryMapper.selectMaxWarehouse()).thenReturn(null);

        InventoryStatsVO result = service.getStats();

        assertThat(result.getTotalQty()).isEqualTo(0L);
        assertThat(result.getMaxWarehouseName()).isNull();
    }

    @Test
    void getChartData_all_marksLowItems() {
        InventoryChartItemVO item1 = new InventoryChartItemVO();
        item1.setProductId(1L); item1.setProductName("手机");
        item1.setQty(420); item1.setAlertQty(50);

        InventoryChartItemVO item2 = new InventoryChartItemVO();
        item2.setProductId(2L); item2.setProductName("耳机");
        item2.setQty(18); item2.setAlertQty(30);

        when(inventoryMapper.selectChartAll()).thenReturn(Arrays.asList(item1, item2));

        List<InventoryChartItemVO> result = service.getChartData("all", null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getIsLow()).isFalse();
        assertThat(result.get(1).getIsLow()).isTrue();
    }

    @Test
    void getChartData_warehouse_callsWarehouseMapper() {
        when(inventoryMapper.selectChartByWarehouse(3L))
                .thenReturn(Collections.emptyList());

        service.getChartData("warehouse", 3L);

        verify(inventoryMapper).selectChartByWarehouse(3L);
        verify(inventoryMapper, never()).selectChartAll();
    }
}
```

- [ ] **步骤 2：确认 test-compile 失败（这是 TDD 的起点）**

```bash
cd D:\AI\warehouse-backend
mvn test-compile 2>&1 | grep "cannot find symbol" | head -5
```

期望：出现 `cannot find symbol: method getStats()` 等错误。

---

## Task 3：后端 — Mapper + Service + ServiceImpl 实现（让测试通过）

**文件：**
- 修改：`src/main/java/com/warehouse/mapper/InventoryMapper.java`
- 修改：`src/main/java/com/warehouse/service/InventoryService.java`
- 修改：`src/main/java/com/warehouse/service/impl/InventoryServiceImpl.java`

- [ ] **步骤 1：InventoryMapper 新增 4 个查询方法**

在 `InventoryMapper.java` 文件顶部 import 区域补充：

```java
import com.warehouse.vo.InventoryChartItemVO;
import com.warehouse.vo.InventoryStatsVO;
import java.util.List;
```

在接口体内现有 3 个方法之后追加：

```java
@Select("SELECT IFNULL(SUM(qty), 0) FROM inventory")
Long selectTotalQty();

@Select("SELECT i.warehouse_id AS max_warehouse_id, w.name AS max_warehouse_name, " +
        "SUM(i.qty) AS max_warehouse_qty " +
        "FROM inventory i " +
        "JOIN warehouse w ON i.warehouse_id = w.id AND w.deleted = 0 " +
        "GROUP BY i.warehouse_id, w.name " +
        "ORDER BY SUM(i.qty) DESC " +
        "LIMIT 1")
InventoryStatsVO selectMaxWarehouse();

@Select("SELECT i.product_id AS product_id, p.name AS product_name, " +
        "SUM(i.qty) AS qty, MAX(i.alert_qty) AS alert_qty " +
        "FROM inventory i " +
        "JOIN product p ON i.product_id = p.id AND p.deleted = 0 " +
        "GROUP BY i.product_id, p.name " +
        "ORDER BY SUM(i.qty) DESC")
List<InventoryChartItemVO> selectChartAll();

@Select("SELECT i.product_id AS product_id, p.name AS product_name, " +
        "i.qty, i.alert_qty " +
        "FROM inventory i " +
        "JOIN product p ON i.product_id = p.id AND p.deleted = 0 " +
        "WHERE i.warehouse_id = #{warehouseId} " +
        "ORDER BY i.qty DESC")
List<InventoryChartItemVO> selectChartByWarehouse(@Param("warehouseId") Long warehouseId);
```

**关键说明：** `application.yml` 已启用 `map-underscore-to-camel-case: true`，SQL 别名 `product_id`→`productId`、`alert_qty`→`alertQty`、`max_warehouse_name`→`maxWarehouseName`、`max_warehouse_id`→`maxWarehouseId` 均自动映射。

- [ ] **步骤 2：InventoryService 接口新增 2 个方法声明**

在 `InventoryService.java` 文件顶部 import 区域补充：

```java
import com.warehouse.vo.InventoryChartItemVO;
import com.warehouse.vo.InventoryStatsVO;
```

在接口体内现有 4 个方法之后追加：

```java
InventoryStatsVO getStats();
List<InventoryChartItemVO> getChartData(String type, Long warehouseId);
```

- [ ] **步骤 3：InventoryServiceImpl 实现 2 个方法**

在 `InventoryServiceImpl.java` 文件顶部 import 区域补充：

```java
import com.warehouse.vo.InventoryChartItemVO;
import com.warehouse.vo.InventoryStatsVO;
```

在 `setAlertQty` 方法之后追加：

```java
@Override
public InventoryStatsVO getStats() {
    InventoryStatsVO result = new InventoryStatsVO();
    Long total = inventoryMapper.selectTotalQty();
    result.setTotalQty(total != null ? total : 0L);
    InventoryStatsVO maxW = inventoryMapper.selectMaxWarehouse();
    if (maxW != null) {
        result.setMaxWarehouseName(maxW.getMaxWarehouseName());
        result.setMaxWarehouseQty(maxW.getMaxWarehouseQty());
        result.setMaxWarehouseId(maxW.getMaxWarehouseId());
    }
    return result;
}

@Override
public List<InventoryChartItemVO> getChartData(String type, Long warehouseId) {
    List<InventoryChartItemVO> items;
    if ("warehouse".equals(type) && warehouseId != null) {
        items = inventoryMapper.selectChartByWarehouse(warehouseId);
    } else {
        items = inventoryMapper.selectChartAll();
    }
    items.forEach(item -> item.setIsLow(
        item.getAlertQty() != null && item.getAlertQty() > 0 &&
        item.getQty() != null && item.getQty() < item.getAlertQty()
    ));
    return items;
}
```

- [ ] **步骤 4：运行单元测试，确认全部通过**

```bash
cd D:\AI\warehouse-backend
mvn test -Dtest=InventoryServiceImplTest 2>&1 | tail -10
```

期望：
```
Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

若测试失败，检查方法名是否与 Task 2 中一致（`selectTotalQty`、`selectMaxWarehouse`、`selectChartAll`、`selectChartByWarehouse`）。

- [ ] **步骤 5：提交**

```bash
cd D:\AI\warehouse-backend
git add src/main/java/com/warehouse/mapper/InventoryMapper.java \
        src/main/java/com/warehouse/service/InventoryService.java \
        src/main/java/com/warehouse/service/impl/InventoryServiceImpl.java \
        src/test/java/com/warehouse/service/InventoryServiceImplTest.java
git commit -m "feat: implement getStats and getChartData in inventory service"
```

---

## Task 4：后端 — InventoryController 新增端点

**文件：**
- 修改：`src/main/java/com/warehouse/controller/InventoryController.java`

- [ ] **步骤 1：在 import 区域补充**

```java
import com.warehouse.vo.InventoryChartItemVO;
import com.warehouse.vo.InventoryStatsVO;
```

（`java.util.List` 现有代码已有）

- [ ] **步骤 2：在 setAlert 方法之后、AlertReq 内部类之前插入**

```java
@GetMapping("/stats")
public Result<InventoryStatsVO> stats() {
    return Result.success(inventoryService.getStats());
}

@GetMapping("/chart")
public Result<List<InventoryChartItemVO>> chart(
        @RequestParam(defaultValue = "all") String type,
        @RequestParam(required = false) Long warehouseId) {
    return Result.success(inventoryService.getChartData(type, warehouseId));
}
```

- [ ] **步骤 3：编译确认**

```bash
cd D:\AI\warehouse-backend
mvn compile -q
```

期望：`BUILD SUCCESS`

- [ ] **步骤 4：提交**

```bash
cd D:\AI\warehouse-backend
git add src/main/java/com/warehouse/controller/InventoryController.java
git commit -m "feat: expose /inventory/stats and /inventory/chart endpoints"
```

---

## Task 5：后端构建 + 部署

- [ ] **步骤 1：打包**

```bash
cd D:\AI\warehouse-backend
mvn package -DskipTests -q
```

期望：`BUILD SUCCESS`，生成 `target/warehouse-backend-1.0.0.jar`

- [ ] **步骤 2：上传并重启**

```bash
scp -i D:/AI/vps_key -o StrictHostKeyChecking=no \
    target/warehouse-backend-1.0.0.jar \
    root@139.84.247.83:/opt/warehouse.jar

ssh -i D:/AI/vps_key root@139.84.247.83 \
    "systemctl restart warehouse.service && sleep 3 && systemctl status warehouse.service --no-pager"
```

期望：`Active: active (running)`

- [ ] **步骤 3：验证新接口**

```bash
TOKEN=$(curl -s -X POST https://api.xiaocup.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.xiaocup.com/api/inventory/stats | python -m json.tool

curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.xiaocup.com/api/inventory/chart?type=all" | python -m json.tool
```

期望：stats 返回 `{ "code":200, "data":{ "totalQty":..., "maxWarehouseName":..., "maxWarehouseId":... } }`；chart 返回包含 `productName`、`qty`、`isLow` 的数组。

---

## Task 6：前端 — API 方法

**文件：**
- 修改：`src/api/inventory.js`

- [ ] **步骤 1：在文件末尾追加 2 行**

```js
export const getInventoryStats = () => request.get('/inventory/stats')
export const getInventoryChart = params => request.get('/inventory/chart', { params })
```

- [ ] **步骤 2：提交**

```bash
cd D:\AI\warehouse-frontend
git add src/api/inventory.js
git commit -m "feat: add getInventoryStats and getInventoryChart API methods"
```

---

## Task 7：前端 — 新建 InventoryBarChart.vue

**文件：**
- 新建：`src/components/InventoryBarChart.vue`

**组件职责：**
- 接收 `chartData`（数组）、`title`（字符串）、`warehouses`（数组）、`showWarehouseSelect`（布尔）4 个 prop
- 当 `showWarehouseSelect=true` 时，顶部显示仓库下拉，用户选择后通过 `$emit('warehouse-change', warehouseId)` 通知父组件
- 用 ECharts 5 渲染柱状图；监听 `chartData` 变化用 `setOption(..., true)` 触发弹起动画
- `isLow=true` 的商品：柱条强制红色 `#ffd6d6`，x 轴商品名加 `⚠` 前缀并显示为红色
- 柱条极矮时（qty < 最大值的 10%），数字标签自动移到柱条顶部外侧

- [ ] **步骤 1：创建文件，完整内容如下**

```vue
<template>
  <div>
    <div v-if="showWarehouseSelect" style="margin-bottom:14px;">
      <el-select
        v-model="selectedWarehouseId"
        placeholder="选择仓库"
        style="width:200px;"
        @change="$emit('warehouse-change', $event)"
      >
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
    </div>
    <div v-show="chartData.length > 0" ref="chartDom" style="width:100%;height:320px;"></div>
    <div v-if="!chartData.length" style="text-align:center;padding:48px;color:#909399;">暂无数据</div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

const PALETTE = ['#dde3ff', '#c8f5ec', '#ffe0d6', '#f0d9f8', '#ffe8c2', '#b3e9ff']
const COLOR_LOW = '#ffd6d6'
const LABEL_COLOR = '#2a2d4a'
const FONT = "'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif"

export default {
  name: 'InventoryBarChart',
  props: {
    chartData:          { type: Array,   default: () => [] },
    title:              { type: String,  default: '' },
    warehouses:         { type: Array,   default: () => [] },
    showWarehouseSelect:{ type: Boolean, default: false }
  },
  data() {
    return { chart: null, selectedWarehouseId: null }
  },
  watch: {
    chartData(val) {
      if (this.chart) this.chart.setOption(this.buildOption(val), true)
    }
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chartDom)
    if (this.chartData.length > 0) {
      this.chart.setOption(this.buildOption(this.chartData))
    }
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    if (this.chart) { this.chart.dispose(); this.chart = null }
  },
  methods: {
    handleResize() { this.chart && this.chart.resize() },
    buildOption(data) {
      const maxQty = data.length ? Math.max(...data.map(d => d.qty || 0), 1) : 1

      return {
        animation: true,
        animationEasing: 'elasticOut',
        animationDuration: 700,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: p => `${p[0].name}：${p[0].value}`
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          data: data.map(d => d.isLow ? '⚠ ' + d.productName : d.productName),
          axisLabel: {
            interval: 0,
            rotate: data.length > 6 ? 30 : 0,
            fontFamily: FONT,
            formatter(value) {
              return value.startsWith('⚠') ? '{low|' + value + '}' : value
            },
            rich: {
              low: { color: '#ba1a1a', fontWeight: 'bold' }
            }
          },
          axisTick: { show: false }
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{
          type: 'bar',
          barMaxWidth: 64,
          data: data.map((d, i) => ({
            value: d.qty,
            itemStyle: {
              color: d.isLow ? COLOR_LOW : PALETTE[i % PALETTE.length],
              borderRadius: [6, 6, 0, 0]
            },
            label: {
              show: true,
              position: (d.qty || 0) / maxQty < 0.1 ? 'top' : 'inside',
              color: LABEL_COLOR,
              fontWeight: 700,
              fontFamily: FONT,
              fontSize: 13,
              formatter: '{c}'
            }
          }))
        }]
      }
    }
  }
}
</script>
```

- [ ] **步骤 2：提交**

```bash
cd D:\AI\warehouse-frontend
git add src/components/InventoryBarChart.vue
git commit -m "feat: add InventoryBarChart with elastic animation and low-stock labels"
```

---

## Task 8：前端 — Dashboard.vue 改造

**文件：**
- 修改：`src/views/Dashboard.vue`

**改动点：**
- `cards` 数组保持不变（移动端继续引用 `cards[0]`～`cards[3]`）
- 新增 `statsData`（来自 `/inventory/stats`）、`activeChart`、`chartData`
- 桌面端卡片由 `v-for` 循环改为 4 个独立卡片（库存总数、最大仓库、库存预警、库存种类）
- 点击前两张卡片切换图表展开区域

- [ ] **步骤 1：替换 `<script>` 部分**

```vue
<script>
import { getAlerts, getInventory, getInventoryStats, getInventoryChart } from '../api/inventory'
import { getInOrders } from '../api/inOrder'
import { getOutOrders } from '../api/outOrder'
import mobileMixin from '../mixins/mobile'
import InventoryBarChart from '../components/InventoryBarChart.vue'

export default {
  components: { InventoryBarChart },
  mixins: [mobileMixin],
  data() {
    return {
      alerts: [],
      cards: [
        { label: '入库单总数', value: 0, icon: 'el-icon-download', color: '#409EFF', route: '/in-orders' },
        { label: '出库单总数', value: 0, icon: 'el-icon-upload2',  color: '#67C23A', route: '/out-orders' },
        { label: '库存预警',   value: 0, icon: 'el-icon-warning',  color: '#E6A23C', route: '/inventory/alerts' },
        { label: '库存种类',   value: 0, icon: 'el-icon-s-grid',   color: '#F56C6C', route: '/inventory' }
      ],
      statsData: { totalQty: 0, maxWarehouseName: '-', maxWarehouseQty: 0, maxWarehouseId: null },
      activeChart: null,
      chartData: []
    }
  },
  computed: {
    activeChartTitle() {
      if (this.activeChart === 'total') return '全部商品库存（所有仓库合计）'
      if (this.activeChart === 'max')   return this.statsData.maxWarehouseName + ' — 商品库存分布'
      return ''
    }
  },
  async created() {
    const [alertRes, inRes, outRes, invRes] = await Promise.all([
      getAlerts().catch(() => ({ data: [] })),
      getInOrders({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } })),
      getOutOrders({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } })),
      getInventory({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } }))
    ])
    this.alerts          = alertRes.data || []
    this.cards[0].value  = inRes.data.total  || 0
    this.cards[1].value  = outRes.data.total || 0
    this.cards[2].value  = this.alerts.length
    this.cards[3].value  = invRes.data.total || 0
    getInventoryStats().catch(() => null).then(r => {
      if (r && r.data) this.statsData = r.data
    })
  },
  methods: {
    async toggleChart(type) {
      if (this.activeChart === type) { this.activeChart = null; return }
      this.activeChart = type
      const params = type === 'max'
        ? { type: 'warehouse', warehouseId: this.statsData.maxWarehouseId }
        : { type: 'all' }
      const r = await getInventoryChart(params).catch(() => ({ data: [] }))
      this.chartData = r.data || []
    }
  }
}
</script>
```

- [ ] **步骤 2：替换桌面端第一个 `<el-row>`（cards 循环），新增图表行**

将 `<template v-if="!isMobile">` 内，现有 `<el-row :gutter="20" style="margin-bottom:20px;">` 那一整块（cards v-for）替换为下面两个 `<el-row>`，其余（快捷入口+预警表格）保持不变：

```html
<!-- 统计卡片 -->
<el-row :gutter="20" style="margin-bottom:20px;">
  <el-col :span="6">
    <el-card shadow="hover"
      :style="{ textAlign:'center', cursor:'pointer', border: activeChart==='total' ? '2px solid #3755c3' : '' }"
      @click.native="toggleChart('total')">
      <i class="el-icon-s-data" style="font-size:36px;color:#3755c3;"></i>
      <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ statsData.totalQty }}</div>
      <div style="color:#909399;">库存总数</div>
      <div style="font-size:11px;color:#3755c3;margin-top:4px;">
        {{ activeChart==='total' ? '▲ 收起' : '▼ 展开图表' }}
      </div>
    </el-card>
  </el-col>
  <el-col :span="6">
    <el-card shadow="hover"
      :style="{ textAlign:'center', cursor:'pointer', border: activeChart==='max' ? '2px solid #00897b' : '' }"
      @click.native="toggleChart('max')">
      <i class="el-icon-office-building" style="font-size:36px;color:#00897b;"></i>
      <div style="font-size:20px;font-weight:bold;margin:8px 0;">{{ statsData.maxWarehouseName }}</div>
      <div style="color:#606266;font-size:14px;">{{ statsData.maxWarehouseQty }} 件</div>
      <div style="color:#909399;margin-top:4px;font-size:12px;">最大仓库</div>
      <div style="font-size:11px;color:#00897b;margin-top:2px;">
        {{ activeChart==='max' ? '▲ 收起' : '▼ 展开图表' }}
      </div>
    </el-card>
  </el-col>
  <el-col :span="6">
    <el-card shadow="hover" style="text-align:center;cursor:pointer;"
      @click.native="$router.push('/inventory/alerts')">
      <i class="el-icon-warning" style="font-size:36px;color:#E6A23C;"></i>
      <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ cards[2].value }}</div>
      <div style="color:#909399;">库存预警</div>
    </el-card>
  </el-col>
  <el-col :span="6">
    <el-card shadow="hover" style="text-align:center;cursor:pointer;"
      @click.native="$router.push('/inventory')">
      <i class="el-icon-s-grid" style="font-size:36px;color:#F56C6C;"></i>
      <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ cards[3].value }}</div>
      <div style="color:#909399;">库存种类</div>
    </el-card>
  </el-col>
</el-row>

<!-- 图表展开区（点击卡片触发，仅桌面端） -->
<el-row v-if="activeChart" style="margin-bottom:20px;">
  <el-col :span="24">
    <el-card>
      <div slot="header" style="display:flex;align-items:center;gap:12px;">
        <span style="font-weight:600;">{{ activeChartTitle }}</span>
        <el-button size="mini" @click="activeChart=null">收起</el-button>
      </div>
      <inventory-bar-chart :chart-data="chartData" :show-warehouse-select="false" />
    </el-card>
  </el-col>
</el-row>
```

- [ ] **步骤 3：本地验证**

```bash
cd D:\AI\warehouse-frontend
npm run serve
```

打开 http://localhost:8080，验证：
1. 桌面端显示 4 张新卡片，库存总数数字来自后端
2. 点击"库存总数"，卡片高亮蓝色边框，下方展开柱状图（弹起动画）
3. 再次点击，图表收起
4. 点击"最大仓库"，图表切换为该仓库数据
5. 低库存商品柱条红色，x 轴商品名有 `⚠ ` 前缀（红色）
6. 移动端布局与修改前完全一致

- [ ] **步骤 4：提交**

```bash
cd D:\AI\warehouse-frontend
git add src/views/Dashboard.vue
git commit -m "feat: dashboard - stats cards with expandable inventory bar chart"
```

---

## Task 9：前端 — inventory/List.vue 改造

**文件：**
- 修改：`src/views/inventory/List.vue`

**改动点（仅桌面端，移动端代码不变）：**
- 工具栏新增视图切换按钮（列表/图表）
- 图表模式：隐藏 el-table，显示两个标签页（全部库存/按仓库查看）

- [ ] **步骤 1：`data()` 末尾追加**

```js
viewMode: 'list',        // 'list' | 'chart'
chartTab: 'all',         // 'all' | 'warehouse'
chartWarehouseId: null,
chartData: []
```

- [ ] **步骤 2：在 script 顶部 import 区补充**

```js
import { getInventoryChart } from '../../api/inventory'
import InventoryBarChart from '../../components/InventoryBarChart.vue'
```

在 `export default {}` 内新增 `components`：

```js
components: { InventoryBarChart },
```

- [ ] **步骤 3：新增 computed 属性 chartTitle**

在现有 `computed:` 块（含 `filteredList`）内追加：

```js
chartTitle() {
  if (this.chartTab === 'all') return '全部商品库存（所有仓库合计）'
  const wh = this.warehouses.find(w => w.id === this.chartWarehouseId)
  return wh ? wh.name + ' — 各商品库存' : '按仓库查看'
}
```

- [ ] **步骤 4：`methods` 末尾追加 loadChartData 方法**

```js
async loadChartData() {
  const params = this.chartTab === 'all'
    ? { type: 'all' }
    : { type: 'warehouse', warehouseId: this.chartWarehouseId }
  const r = await getInventoryChart(params).catch(() => ({ data: [] }))
  this.chartData = r.data || []
}
```

- [ ] **步骤 5：替换桌面端工具栏和主体区域**

将 `<el-card v-if="!isMobile">` 内部（从第一个 `<div style="margin-bottom:16px;...">` 到 `</el-dialog>` 为止，不含最外层 `</el-card>`）替换为：

```html
<!-- 工具栏 -->
<div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
  <template v-if="viewMode==='list'">
    <el-select v-model="query.warehouseId" placeholder="全部仓库" clearable style="width:150px;" @change="onFilter">
      <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
    </el-select>
    <el-button type="primary" icon="el-icon-search" @click="onFilter">搜索</el-button>
  </template>
  <div style="margin-left:auto;display:flex;gap:8px;">
    <el-button :type="viewMode==='list'?'primary':'default'" size="small"
      icon="el-icon-menu" @click="viewMode='list'">列表</el-button>
    <el-button :type="viewMode==='chart'?'primary':'default'" size="small"
      icon="el-icon-data-analysis" @click="viewMode='chart';loadChartData()">图表</el-button>
  </div>
</div>

<!-- 列表视图 -->
<template v-if="viewMode==='list'">
  <el-table :data="list" v-loading="loading" border stripe>
    <el-table-column label="仓库" min-width="120">
      <template slot-scope="{row}">{{ warehouseMap[row.warehouseId] || row.warehouseId }}</template>
    </el-table-column>
    <el-table-column label="商品" min-width="160">
      <template slot-scope="{row}">{{ productMap[row.productId] || row.productId }}</template>
    </el-table-column>
    <el-table-column prop="qty" label="当前库存" width="110" align="center" />
    <el-table-column prop="alertQty" label="预警值" width="100" align="center" />
    <el-table-column label="状态" width="100" align="center">
      <template slot-scope="{row}">
        <el-tag v-if="row.alertQty > 0 && row.qty < row.alertQty" type="danger">库存不足</el-tag>
        <el-tag v-else type="success">正常</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="updateTime" label="更新时间" min-width="160" />
    <el-table-column label="操作" width="120" align="center">
      <template slot-scope="{row}">
        <el-button size="mini" @click="setAlert(row)">设置预警值</el-button>
      </template>
    </el-table-column>
  </el-table>
  <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
    :total="total" :current-page="query.current"
    @current-change="p=>{query.current=p;loadData()}" />
</template>

<!-- 图表视图 -->
<template v-else>
  <el-tabs v-model="chartTab" @tab-click="loadChartData" style="margin-bottom:12px;">
    <el-tab-pane label="全部库存" name="all" />
    <el-tab-pane label="按仓库查看" name="warehouse" />
  </el-tabs>
  <inventory-bar-chart
    :chart-data="chartData"
    :show-warehouse-select="chartTab==='warehouse'"
    :warehouses="warehouses"
    @warehouse-change="id=>{chartWarehouseId=id;loadChartData()}"
  />
</template>

<!-- 预警值弹窗 -->
<el-dialog title="设置预警值" :visible.sync="alertDialog" width="360px">
  <el-form label-width="90px">
    <el-form-item label="商品">
      <el-input :value="productMap[alertForm.productId] || alertForm.productId" disabled />
    </el-form-item>
    <el-form-item label="预警库存">
      <el-input-number v-model="alertForm.alertQty" :min="0" style="width:100%;" />
    </el-form-item>
  </el-form>
  <div slot="footer">
    <el-button @click="alertDialog=false">取消</el-button>
    <el-button type="primary" @click="saveAlert">保存</el-button>
  </div>
</el-dialog>
```

- [ ] **步骤 6：本地验证**

```bash
cd D:\AI\warehouse-frontend
npm run serve
```

打开库存查询页，验证：
1. 工具栏右侧出现"列表"/"图表"按钮，当前激活为蓝色
2. 点击"图表"，进入图表视图，展示全部商品柱状图
3. 点击"按仓库查看"，图表组件内部显示仓库下拉选择框
4. 选择仓库后，柱状图以弹起动画更新
5. 低库存商品柱条红色，商品名有 `⚠ ` 前缀（红色）
6. 极矮柱条（qty 远小于最大值）的数字显示在柱条顶部外侧
7. 移动端（DevTools 模拟）保持原样，无视图切换按钮

- [ ] **步骤 7：提交**

```bash
cd D:\AI\warehouse-frontend
git add src/views/inventory/List.vue
git commit -m "feat: inventory list - add chart view with all/warehouse tabs"
```

---

## Task 10：前端构建 + 部署

- [ ] **步骤 1：构建**

```bash
cd D:\AI\warehouse-frontend
npm run build
```

期望输出末尾：`Build complete.`

- [ ] **步骤 2：推送触发 Vercel 自动部署**

```bash
git add -A
git commit -m "feat: dashboard charts and inventory chart view complete"
git push origin main
```

- [ ] **步骤 3：线上验收（约 1 分钟后）**

打开 https://xiaocup.com，逐项确认：
1. 首页点击"库存总数"卡片，下方展开柱状图，再次点击收起
2. 点击"最大仓库"卡片，图表切换为该仓库数据
3. 库存查询页右上角可切换列表/图表视图
4. 图表视图内标签页切换正常
5. 按仓库切换时有弹起动画
6. 低库存商品柱条红色，商品名加 `⚠`（红色）
7. 数量数字居中显示在柱内，极矮柱条时移到外侧

- [ ] **步骤 4：打标签**

```bash
git tag v3.1-charts
git push origin v3.1-charts
```

---

## 自检

### 规范覆盖确认

| 规范需求 | 对应 Task |
|---------|----------|
| `GET /inventory/stats` 端点 | Task 3–4 |
| `GET /inventory/chart` 端点 | Task 3–4 |
| 首页库存总数卡片 | Task 8 |
| 首页最大仓库卡片 | Task 8 |
| 点击卡片展开/切换/收起图表 | Task 8 |
| 库存查询列表/图表切换按钮 | Task 9 |
| 全部库存标签 | Task 9 |
| 按仓库查看标签 + 下拉 | Task 9 |
| 弹起动画（elasticOut） | Task 7 |
| 低库存柱条红色 `#ffd6d6` | Task 7 |
| 商品名加 `⚠` 前缀（红色） | Task 7 |
| 极矮柱条数字移外侧 | Task 7 |
| 移动端不受影响 | Task 8（cards 保留）、Task 9（仅桌面端改动）|

### 类型一致性确认

- `inventoryMapper.selectTotalQty()` → `Long` → `result.setTotalQty(Long)` ✓
- `inventoryMapper.selectMaxWarehouse()` → `InventoryStatsVO`（含 `maxWarehouseId`） → Task 8 中 `statsData.maxWarehouseId` 传给 API ✓
- `selectChartByWarehouse(Long)` → Task 3 ServiceImpl 调用 `selectChartByWarehouse(warehouseId)` ✓
- `item.setIsLow(Boolean)` → Lombok `getIsLow()` → Jackson 序列化为 `"isLow"` → 前端 `d.isLow` ✓
- `InventoryBarChart` prop `chartData`（数组）与 Task 8/9 传入的 `chartData`（`r.data`）格式一致 ✓
