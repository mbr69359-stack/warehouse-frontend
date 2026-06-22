<template>
  <div>

    <!-- ── 桌面端 ── -->
    <template v-if="!isMobile">
      <!-- 仓库选择器 -->
      <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;">
        <span style="color:#606266;font-weight:500;">查看仓库：</span>
        <el-select v-model="selectedWarehouseId"
          style="width:200px;" @change="onWarehouseChange">
          <el-option label="全部仓库" :value="0" />
          <el-option v-for="w in warehouseList" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-button-group style="margin-left:8px;">
          <el-button :type="displayUnit==='box'?'primary':''" size="small" @click="$store.commit('SET_DISPLAY_UNIT','box')">按箱</el-button>
          <el-button :type="displayUnit==='piece'?'primary':''" size="small" @click="$store.commit('SET_DISPLAY_UNIT','piece')">按个</el-button>
        </el-button-group>
      </div>

      <el-row :gutter="20" style="margin-bottom:20px;">
        <!-- 库存总数（可展开图表） -->
        <el-col :span="selectedWarehouseId ? 8 : 6">
          <el-card shadow="hover" :class="['dash-card', activeChart === 'total' ? 'dash-card--active' : '']"
            style="text-align:center;cursor:pointer;" @click.native="toggleChart('total')">
            <i class="el-icon-s-data" style="fontSize:36px;color:#409EFF"></i>
            <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ formattedTotalQty }}</div>
            <div style="color:#909399;">库存总数（{{ displayUnit==='box'?'箱':'个' }}）</div>
          </el-card>
        </el-col>
        <!-- 主仓库（可展开图表） -->
        <el-col :span="6" v-if="!selectedWarehouseId">
          <el-card shadow="hover" :class="['dash-card', activeChart === 'max' ? 'dash-card--active' : '']"
            style="text-align:center;cursor:pointer;" @click.native="toggleChart('max')">
            <i class="el-icon-office-building" style="fontSize:36px;color:#67C23A"></i>
            <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ formattedMaxWhQty }}</div>
            <div style="color:#909399;">{{ statsData.maxWarehouseName || '主仓库' }}</div>
          </el-card>
        </el-col>
        <!-- 库存预警 -->
        <el-col :span="selectedWarehouseId ? 8 : 6">
          <el-card shadow="hover" class="dash-card" style="text-align:center;cursor:pointer;"
            @click.native="$router.push('/inventory/alerts')">
            <i class="el-icon-warning" style="fontSize:36px;color:#E6A23C"></i>
            <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ cards[2].value }}</div>
            <div style="color:#909399;">库存预警</div>
          </el-card>
        </el-col>
        <!-- 库存种类 -->
        <el-col :span="selectedWarehouseId ? 8 : 6">
          <el-card shadow="hover" class="dash-card" style="text-align:center;cursor:pointer;"
            @click.native="$router.push('/inventory')">
            <i class="el-icon-s-grid" style="fontSize:36px;color:#F56C6C"></i>
            <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ cards[3].value }}</div>
            <div style="color:#909399;">库存种类</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 选中仓库时的库存明细（汇总数字统一显示在上方统计行，不再重复） -->
      <el-card v-if="selectedWarehouseId" style="margin-bottom:20px;" v-loading="warehouseInvLoading">
        <div slot="header" style="display:flex;justify-content:space-between;align-items:center;">
          <span>{{ selectedWarehouseName }} · 库存明细</span>
          <el-button type="text" @click="$router.push('/inventory?warehouseId='+selectedWarehouseId)">查看全部</el-button>
        </div>
        <el-table :data="warehouseInvList" size="small" border stripe>
          <el-table-column label="商品" min-width="160">
            <template slot-scope="{row}">{{ productMap[row.productId]?.name || ('商品#'+row.productId) }}</template>
          </el-table-column>
          <el-table-column label="库存数量" width="120" align="center">
            <template slot-scope="{row}">{{ formatWarehouseQty(row) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template slot-scope="{row}">
              <el-tag v-if="row.alertQty > 0 && row.qty < row.alertQty" type="danger" size="mini">预警</el-tag>
              <el-tag v-else type="success" size="mini">正常</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 财务KPI行 -->
      <el-row :gutter="20" style="margin-bottom:20px;">
        <el-col :span="8">
          <el-card shadow="hover" class="dash-card" style="text-align:center;">
            <i class="el-icon-coin" style="fontSize:36px;color:#909399"></i>
            <div style="font-size:28px;font-weight:bold;margin:8px 0;">KSh {{ formatAmount(statsData.totalValue) }}</div>
            <div style="color:#909399;">总库存价值</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="dash-card" style="text-align:center;cursor:pointer;"
            @click.native="$router.push('/out-orders')">
            <i class="el-icon-sell" style="fontSize:36px;color:#409EFF"></i>
            <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ kpi.todayOutQty }}<span style="font-size:14px;font-weight:400;margin-left:2px;">箱</span></div>
            <div style="color:#909399;">今日出库量</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="dash-card" style="text-align:center;">
            <i class="el-icon-money" style="fontSize:36px;color:#67C23A"></i>
            <div style="font-size:28px;font-weight:bold;margin:8px 0;">KSh {{ formatAmount(kpi.monthSalesAmount) }}</div>
            <div style="color:#909399;">本月销售额</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 损坏待核销提醒 -->
      <el-alert v-if="pendingDamageCount > 0"
        :title="`${pendingDamageCount} 件损坏品待核销，请及时创建出库单完成核销`"
        type="warning" show-icon :closable="false"
        style="margin-bottom:20px;cursor:pointer;"
        @click.native="$router.push('/damage-records')" />
      <!-- 待确认出库单提醒 -->
      <el-alert v-if="pendingOutOrderCount > 0"
        :title="`${pendingOutOrderCount} 张出库单待确认实际数量，请及时处理`"
        type="warning" show-icon :closable="false"
        style="margin-bottom:20px;cursor:pointer;"
        @click.native="$router.push('/out-orders')" />

      <!-- 展开图表区（带过渡动画） -->
      <transition name="chart-slide" mode="out-in">
        <el-card v-if="activeChart" :key="activeChart + '_' + (selectedWarehouseId || 'all')" style="margin-bottom:20px;" v-loading="chartLoading">
          <inventory-bar-chart :chart-data="enrichedChartData" :horizontal="true" :unit="displayUnit"
            :title="chartTitle" />
        </el-card>
      </transition>
      <!-- 趋势折线图 + 商品占比环形图 -->
      <el-row :gutter="20" style="margin-bottom:20px;">
        <el-col :span="16">
          <el-card>
            <div slot="header">本月入库 vs 出库趋势</div>
            <trend-chart :in-data="trendIn" :out-data="trendOut" :unit="displayUnit" />
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <div slot="header">库存商品占比</div>
            <donut-chart :chart-data="enrichedChartData" :unit="displayUnit" />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card>
            <div slot="header">快捷入口</div>
            <el-button type="primary" icon="el-icon-download" @click="$router.push('/in-orders/create')">新建入库单</el-button>
            <el-button type="success" icon="el-icon-upload2" style="margin-left:12px;" @click="$router.push('/out-orders/create')">新建出库单</el-button>
            <el-button type="warning" icon="el-icon-document-checked" style="margin-left:12px;" @click="$router.push('/inventory/check')">库存盘点</el-button>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <div slot="header" style="display:flex;justify-content:space-between;">
              <span>库存预警 · {{ selectedWarehouseName }}<span v-if="alertChartData.length" style="color:#E6A23C;margin-left:6px;">{{ alertChartData.length }}</span></span>
              <el-link type="primary" @click="$router.push('/inventory/alerts')">查看全部</el-link>
            </div>
            <inventory-bar-chart v-if="alertChartData.length" :chart-data="alertChartData" title="" :unit="displayUnit"
              :height="Math.max(200, alertChartData.length * 40) + 'px'" :horizontal="true" />
            <el-empty v-else description="当前没有库存预警" :image-size="60" />
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- ── 移动端 ── -->
    <div v-else class="m-page">

      <div style="padding:12px 16px 0;">
        <el-select v-model="selectedWarehouseId"
          style="width:100%;" size="small" @change="onWarehouseChange">
          <el-option label="全部仓库" :value="0" />
          <el-option v-for="w in warehouseList" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-button-group style="margin-top:8px;display:flex;">
          <el-button :type="displayUnit==='box'?'primary':''" size="small" style="flex:1;" @click="$store.commit('SET_DISPLAY_UNIT','box')">按箱</el-button>
          <el-button :type="displayUnit==='piece'?'primary':''" size="small" style="flex:1;" @click="$store.commit('SET_DISPLAY_UNIT','piece')">按个</el-button>
        </el-button-group>
      </div>

      <!-- 页头 -->
      <div class="m-page-header">
        <h2 class="m-page-title">工作台</h2>
        <p class="m-page-sub">{{ selectedWarehouseName }} · {{ displayUnit==='box'?'按箱':'按个' }}统计</p>
      </div>

      <!-- 今日概览 -->
      <section class="m-section">
        <div class="m-section-header">
          <span class="m-section-title">今日概览</span>
        </div>
        <!-- 2×2 统计网格 -->
        <div class="m-stat-grid">
          <div class="m-stat-card" @click="$router.push('/in-orders')">
            <div class="m-stat-label">待入库</div>
            <div class="m-stat-value">{{ cards[0].value }}</div>
          </div>
          <div class="m-stat-card" @click="$router.push('/out-orders')">
            <div class="m-stat-label">待出库</div>
            <div class="m-stat-value">{{ cards[1].value }}</div>
          </div>
          <div class="m-stat-card" @click="$router.push('/inventory')">
            <div class="m-stat-label">库存总数</div>
            <div class="m-stat-value" style="font-size:18px;">{{ formattedTotalQty }}</div>
          </div>
          <div class="m-stat-card" @click="$router.push('/inventory')">
            <div class="m-stat-label">库存种类</div>
            <div class="m-stat-value">{{ cards[3].value }}</div>
          </div>
        </div>
        <!-- 库存预警 全宽长方形 -->
        <div v-if="cards[2].value > 0" class="m-alert-banner" @click="$router.push('/inventory/alerts')">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="material-symbols-outlined" style="font-size:22px;">warning</span>
            <div>
              <div style="font-size:12px;opacity:.85;">库存预警</div>
              <div style="font-size:22px;font-weight:700;line-height:1.1;">{{ cards[2].value }} <span style="font-size:13px;font-weight:400;">件商品低于预警值</span></div>
            </div>
          </div>
          <span class="material-symbols-outlined" style="font-size:20px;opacity:.7;">chevron_right</span>
        </div>
        <!-- 损坏待核销提醒 -->
        <div v-if="pendingDamageCount > 0" class="m-damage-banner" @click="$router.push('/damage-records')">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="material-symbols-outlined" style="font-size:22px;">broken_image</span>
            <div>
              <div style="font-size:12px;opacity:.85;">损坏待核销</div>
              <div style="font-size:22px;font-weight:700;line-height:1.1;">{{ pendingDamageCount }} <span style="font-size:13px;font-weight:400;">件损坏品待核销</span></div>
            </div>
          </div>
          <span class="material-symbols-outlined" style="font-size:20px;opacity:.7;">chevron_right</span>
        </div>
      </section>

      <!-- 本月经营 -->
      <section class="m-section">
        <div class="m-section-title" style="margin-bottom:12px;">本月经营</div>
        <div class="m-stat-grid">
          <div class="m-stat-card" @click="$router.push('/out-orders')">
            <div class="m-stat-label">今日出库量</div>
            <div class="m-stat-value">{{ kpi.todayOutQty }}<span style="font-size:13px;font-weight:400;">箱</span></div>
          </div>
          <div class="m-stat-card">
            <div class="m-stat-label">本月销售额</div>
            <div class="m-stat-value" style="font-size:18px;">KSh {{ formatAmount(kpi.monthSalesAmount) }}</div>
          </div>
        </div>
      </section>

      <!-- 快捷功能 2×2 -->
      <section class="m-section">
        <div class="m-section-title" style="margin-bottom:12px;">快捷功能</div>
        <div class="m-quick-grid2">
          <button class="m-quick-btn2" @click="$router.push('/in-orders/create')">
            <div class="m-quick-icon2 primary">
              <span class="material-symbols-outlined">input</span>
            </div>
            <span class="m-quick-label">新建入库</span>
          </button>
          <button class="m-quick-btn2" @click="$router.push('/out-orders/create')">
            <div class="m-quick-icon2">
              <span class="material-symbols-outlined">output</span>
            </div>
            <span class="m-quick-label">新建出库</span>
          </button>
          <button class="m-quick-btn2" @click="$router.push('/inventory')">
            <div class="m-quick-icon2">
              <span class="material-symbols-outlined">inventory_2</span>
            </div>
            <span class="m-quick-label">库存查询</span>
          </button>
          <button class="m-quick-btn2" @click="$router.push('/inventory/check')">
            <div class="m-quick-icon2">
              <span class="material-symbols-outlined">rule</span>
            </div>
            <span class="m-quick-label">库存盘点</span>
          </button>
        </div>
      </section>

    </div>
  </div>
</template>

<script>
import { getInventory, getInventoryChart } from '../api/inventory'
import { getPendingCount } from '../api/damageRecord'
import { getInOrders } from '../api/inOrder'
import { getOutOrders, getDraftOutOrderCount } from '../api/outOrder'
import { getProducts } from '../api/product'
import { getDashboardStats, getInReport, getOutReport, getInventorySummary } from '../api/report'
import { getWarehouses } from '../api/warehouse'
import mobileMixin from '../mixins/mobile'
import InventoryBarChart from '../components/InventoryBarChart.vue'
import TrendChart from '../components/TrendChart.vue'
import DonutChart from '../components/DonutChart.vue'
export default {
  components: { InventoryBarChart, TrendChart, DonutChart },
  mixins: [mobileMixin],
  data() {
    return {
      pendingDamageCount: 0, pendingOutOrderCount: 0,
      selectedWarehouseId: 0,   // 0 = 全部仓库（保持 falsy，模板判断不变；发请求经 whParam 转 null）
      warehouseList: [],
      warehouseInvList: [],
      invRows: [],   // 全量库存行（含 alertQty），预警面板按仓库前端过滤
      warehouseInvLoading: false,
      statsData: { totalQty: 0, totalBoxCount: 0, looseCount: 0, totalValue: 0, maxWarehouseName: '', maxWarehouseQty: 0, maxWarehouseBoxQty: 0, maxWarehouseId: null },
      kpi: { todayOutQty: 0, monthSalesAmount: 0 },
      trendIn: [], trendOut: [],
      trendRange: { startDate: '', endDate: '' },
      activeChart: null,
      chartData: [],
      chartLoading: false,
      productMap: {},
      cards: [
        { label: '待入库', value: 0, icon: 'el-icon-download', color: '#409EFF', route: '/in-orders' },
        { label: '待出库', value: 0, icon: 'el-icon-upload2',  color: '#67C23A', route: '/out-orders' },
        { label: '库存预警',   value: 0, icon: 'el-icon-warning',  color: '#E6A23C', route: '/inventory/alerts' },
        { label: '库存种类',   value: 0, icon: 'el-icon-s-grid',   color: '#F56C6C', route: '/inventory' }
      ]
    }
  },
  async created() {
    const { firstDayOfMonthKe, todayKe } = await import('../utils/time')
    const startDate = firstDayOfMonthKe()
    const endDate = todayKe()
    this.trendRange = { startDate, endDate }
    getPendingCount().then(r => { this.pendingDamageCount = r.data || 0 }).catch(() => {})
    getDraftOutOrderCount().then(n => { this.pendingOutOrderCount = n })
    getWarehouses().then(r => { this.warehouseList = r.data || [] })
    const [dashRes, inRes, outRes, prodRes, chartRes, trendInRes, trendOutRes] = await Promise.all([
      getDashboardStats({ warehouseId: this.whParam }).catch(() => ({ data: {} })),
      getInOrders({ current: 1, size: 1, status: 'DRAFT' }).catch(() => ({ data: { total: 0 } })),
      getOutOrders({ current: 1, size: 1, status: 'DRAFT' }).catch(() => ({ data: { total: 0 } })),
      getProducts({ size: 1000 }).catch(() => ({ data: {} })),
      getInventoryChart({ type: 'all' }).catch(() => ({ data: [] })),
      getInReport({ startDate, endDate }).catch(() => ({ data: [] })),
      getOutReport({ startDate, endDate }).catch(() => ({ data: [] }))
    ])
    getInventory({ current: 1, size: 10000 })
      .then(r => { this.invRows = r.data.records || [] }).catch(() => {})
    const prodItems = prodRes.data.records || prodRes.data || []
    this.productMap = Object.fromEntries(prodItems.map(p => [p.id, p]))
    this.cards[0].value = inRes.data.total  || 0
    this.cards[1].value = outRes.data.total || 0
    const d = dashRes.data || {}
    this.cards[2].value = d.alertCount   || 0
    this.cards[3].value = d.productCount || 0
    this.statsData = {
      totalQty:           d.totalQty           || 0,
      totalBoxCount:      d.totalBoxCount       || 0,
      looseCount:         d.looseCount          || 0,
      totalValue:         d.totalValue          || 0,
      maxWarehouseName:   d.maxWarehouseName    || '',
      maxWarehouseQty:    d.maxWarehouseQty     || 0,
      maxWarehouseBoxQty: d.maxWarehouseBoxQty  || 0,
      maxWarehouseId:     d.maxWarehouseId      || null
    }
    this.chartData = chartRes.data || []
    this.kpi = { todayOutQty: d.todayOutQty || 0, monthSalesAmount: d.monthSalesAmount || 0 }
    this.trendIn  = trendInRes.data  || []
    this.trendOut = trendOutRes.data || []
  },
  mounted() {
    this.$nextTick(() => { this.activeChart = 'total' })
  },
  computed: {
    whParam() {
      return this.selectedWarehouseId || null
    },
    selectedWarehouseName() {
      if (!this.selectedWarehouseId) return '全部仓库'
      const w = this.warehouseList.find(wh => wh.id === this.selectedWarehouseId)
      return w ? w.name : '仓库'
    },
    displayUnit() { return this.$store.state.displayUnit },
    enrichedChartData() {
      return (this.chartData || []).map(d => ({
        ...d,
        qtyPerBox: this.productMap[d.productId]?.qtyPerBox || 0
      }))
    },
    selectedWarehouseType() {
      const w = this.warehouseList.find(w => w.id === this.selectedWarehouseId)
      return w?.type || null
    },
    formattedTotalQty() {
      if (this.displayUnit === 'box') {
        const boxes = this.statsData.totalBoxCount || 0
        const loose = this.statsData.looseCount || 0
        return loose > 0 ? `${boxes}箱 ${loose}个` : `${boxes} 箱`
      }
      return `${this.statsData.totalQty || 0} 个`
    },
    formattedMaxWhQty() {
      if (this.displayUnit === 'box') return `${this.statsData.maxWarehouseBoxQty || 0} 箱`
      return `${this.statsData.maxWarehouseQty || 0} 个`
    },
    chartTitle() {
      if (this.selectedWarehouseId) return `${this.selectedWarehouseName} 库存分布`
      return this.activeChart === 'total' ? '全部库存分布' : `${this.statsData.maxWarehouseName} 库存分布`
    },
    alertChartData() {
      const multiWh = !this.selectedWarehouseId && this.warehouseList.length > 1
      return this.invRows
        .filter(r => (!this.selectedWarehouseId || r.warehouseId === this.selectedWarehouseId) &&
                     r.alertQty > 0 && r.qty < r.alertQty)
        .map(r => {
          const p = this.productMap[r.productId]
          let name = p ? p.name : `商品#${r.productId}`
          if (multiWh) {
            const w = this.warehouseList.find(w => w.id === r.warehouseId)
            if (w) name += `（${w.name}）`
          }
          return { productName: name, qty: r.qty, alertQty: r.alertQty, isLow: true, qtyPerBox: p?.qtyPerBox || 0 }
        })
    },
  },
  methods: {
    formatWarehouseQty(row) {
      const qty = Number(row.qty) || 0
      const prod = this.productMap[row.productId]
      const qpb = prod?.qtyPerBox || 48
      if (this.displayUnit === 'piece') return `${qty} 个`
      const boxes = Math.floor(qty / qpb)
      const loose = qty % qpb
      return loose > 0 ? `${boxes}箱 ${loose}个` : `${boxes}箱`
    },
    formatAmount(val) {
      return (Number(val) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    },
    async toggleChart(type) {
      if (this.activeChart === type) return
      this.activeChart = type
      await this.loadChartData()
    },
    // 后端 /inventory/chart 只在 type='warehouse' 时按仓库过滤，选中仓库后必须用该模式
    async loadChartData() {
      this.chartData = []
      this.chartLoading = true
      let params
      if (this.selectedWarehouseId) {
        params = { type: 'warehouse', warehouseId: this.selectedWarehouseId }
      } else if (this.activeChart === 'max') {
        params = { type: 'warehouse', warehouseId: this.statsData.maxWarehouseId }
      } else {
        params = { type: 'all' }
      }
      const res = await getInventoryChart(params).catch(() => ({ data: [] }))
      this.chartData = res.data || []
      this.chartLoading = false
    },
    loadOrderCounts() {
      const params = { current: 1, size: 1, status: 'DRAFT' }
      if (this.selectedWarehouseId) params.warehouseId = this.selectedWarehouseId
      getInOrders(params).then(r => { this.cards[0].value = r.data.total || 0 }).catch(() => {})
      getOutOrders(params).then(r => { this.cards[1].value = r.data.total || 0 }).catch(() => {})
    },
    async onWarehouseChange() {
      const d = (await getDashboardStats({ warehouseId: this.whParam })
        .catch(() => ({ data: {} }))).data || {}
      this.cards[2].value = d.alertCount   || 0
      this.cards[3].value = d.productCount || 0
      this.statsData = {
        totalQty:           d.totalQty           || 0,
        totalBoxCount:      d.totalBoxCount       || 0,
        looseCount:         d.looseCount          || 0,
        totalValue:         d.totalValue          || 0,
        maxWarehouseName:   d.maxWarehouseName    || '',
        maxWarehouseQty:    d.maxWarehouseQty     || 0,
        maxWarehouseBoxQty: d.maxWarehouseBoxQty  || 0,
        maxWarehouseId:     d.maxWarehouseId      || null
      }
      this.kpi = { todayOutQty: d.todayOutQty || 0, monthSalesAmount: d.monthSalesAmount || 0 }
      const { startDate, endDate } = this.trendRange
      const trendWhId = this.selectedWarehouseId || undefined
      getInReport({ startDate, endDate, warehouseId: trendWhId })
        .then(r => { this.trendIn = r.data || [] }).catch(() => {})
      getOutReport({ startDate, endDate, warehouseId: trendWhId })
        .then(r => { this.trendOut = r.data || [] }).catch(() => {})
      if (this.selectedWarehouseId) {
        this.warehouseInvLoading = true
        getInventory({ warehouseId: this.selectedWarehouseId, size: 50 })
          .then(r => { this.warehouseInvList = r.data.records || [] })
          .catch(() => {})
          .finally(() => { this.warehouseInvLoading = false })
      } else {
        this.warehouseInvList = []
      }
      this.loadOrderCounts()
      getInventory({ current: 1, size: 10000 })
        .then(r => { this.invRows = r.data.records || [] }).catch(() => {})
      // 选中具体仓库后"主仓库"卡片隐藏，图表回到该仓库的总分布
      if (this.selectedWarehouseId && this.activeChart === 'max') this.activeChart = 'total'
      await this.loadChartData()
    }
  }
}
</script>

<style scoped>
.dash-card { transition: box-shadow .2s, border-color .2s; }
.dash-card--active { border: 1px solid #409EFF !important; box-shadow: 0 0 0 2px rgba(64,158,255,.2) !important; }

.chart-slide-enter-active { transition: opacity .2s cubic-bezier(0.23, 1, 0.32, 1), transform .2s cubic-bezier(0.23, 1, 0.32, 1); }
.chart-slide-leave-active { transition: opacity .12s ease; }
.chart-slide-enter { opacity: 0; transform: translateY(-10px); }
.chart-slide-leave-to { opacity: 0; }

/* 减少动态效果：保留淡入、去掉位移 */
@media (prefers-reduced-motion: reduce) {
  .chart-slide-enter-active { transition: opacity .15s ease !important; }
  .chart-slide-enter { transform: none !important; }
}

.m-alert-banner {
  margin-top: 10px;
  background: #ffdad6;
  border: 1px solid rgba(186,26,26,.2);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ba1a1a;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m-alert-banner:active { opacity: .8; }

.m-damage-banner {
  margin-top: 10px;
  background: #fff3cd;
  border: 1px solid rgba(255,160,0,.3);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #7a4f00;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m-damage-banner:active { opacity: .8; }

.m-quick-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.m-quick-btn2 {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #c4c5d5;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background .15s, transform .1s;
}
.m-quick-btn2:active { background: #e6eeff; transform: scale(.97); }
.m-quick-icon2 {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: #e6eeff;
  display: flex; align-items: center; justify-content: center;
  color: #00288e; flex-shrink: 0;
}
.m-quick-icon2 .material-symbols-outlined { font-size: 24px; }
.m-quick-icon2.primary { background: #00288e; color: #fff; }
.m-quick-label {
  font-size: 14px; font-weight: 600; color: #121c2a;
}
</style>