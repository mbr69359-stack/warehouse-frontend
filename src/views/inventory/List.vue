<template>
  <div>

    <!-- ── 桌面端 ── -->
    <el-card v-if="!isMobile">
      <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;">
        <template v-if="viewMode === 'list'">
          <el-select v-model="query.warehouseId" placeholder="全部仓库" clearable style="width:150px;" @change="onFilter">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
          <el-button type="primary" icon="el-icon-search" @click="onFilter">搜索</el-button>
        </template>
        <div style="margin-left:auto;">
          <el-button-group>
            <el-button :type="viewMode==='list'?'primary':''" icon="el-icon-menu" @click="switchViewMode('list')">列表</el-button>
            <el-button :type="viewMode==='chart'?'primary':''" icon="el-icon-data-analysis" @click="switchViewMode('chart')">图表</el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 图表视图 -->
      <div v-if="viewMode === 'chart'">
        <el-tabs v-model="chartTab">
          <el-tab-pane label="全部库存" name="all" />
          <el-tab-pane label="按仓库查看" name="warehouse" />
        </el-tabs>
        <div v-loading="chartLoading">
          <inventory-bar-chart
            :chart-data="chartData"
            :title="chartTab === 'all' ? '全部商品库存' : ''"
            :warehouses="warehouses"
            :show-warehouse-select="chartTab === 'warehouse'"
            height="380px"
            @warehouse-change="onWarehouseChange" />
        </div>
      </div>

      <!-- 列表视图 -->
      <el-table v-if="viewMode === 'list'" :data="list" v-loading="loading" border stripe>
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
          <template slot-scope="{row}"><el-button size="mini" @click="setAlert(row)">设置预警值</el-button></template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="viewMode === 'list'" style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
        :total="total" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />
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
    </el-card>

    <!-- ── 移动端 ── -->
    <div v-else class="m-page">

      <!-- 搜索 + 筛选 -->
      <div class="m-search-bar">
        <div class="m-search-wrapper">
          <span class="material-symbols-outlined m-search-icon">barcode_scanner</span>
          <input class="m-search-input" v-model="mobileSearch" placeholder="搜索 SKU、条码或商品名称" />
        </div>
      </div>

      <!-- 筛选芯片 -->
      <div class="mi-chips">
        <button class="mi-chip" :class="{ active: filterChip===null }" @click="filterChip=null">全部商品</button>
        <button class="mi-chip" :class="{ active: filterChip==='low' }" @click="filterChip='low'">低库存</button>
        <button class="mi-chip" :class="{ active: filterChip==='normal' }" @click="filterChip='normal'">库存正常</button>
      </div>

      <!-- loading -->
      <div v-if="loading" style="text-align:center;padding:40px;">
        <span class="material-symbols-outlined" style="font-size:36px;color:#757684;animation:spin 1s linear infinite;">sync</span>
      </div>

      <!-- 库存卡片 -->
      <div v-else class="m-inv-list">
        <div v-for="row in filteredList" :key="row.productId+'_'+row.warehouseId" class="m-inv-card">
          <!-- 卡头（可点击展开） -->
          <div class="m-inv-card-header" @click="toggleCard(row)">
            <div class="m-inv-info">
              <div class="m-inv-name">{{ productMap[row.productId] || ('商品 #'+row.productId) }}</div>
              <div class="m-inv-sub">仓库: {{ warehouseMap[row.warehouseId] || row.warehouseId }}</div>
            </div>
            <div class="m-inv-nums">
              <div class="m-inv-num-block">
                <div class="m-inv-num-label">总库存</div>
                <div class="m-inv-num-val" :class="isLow(row)?'warn':''">{{ row.qty }}</div>
              </div>
            </div>
            <span class="m-status-badge" :class="isLow(row)?'danger':'success'" style="margin-left:8px;">
              {{ isLow(row)?'不足':'正常' }}
            </span>
            <span class="material-symbols-outlined"
              style="color:#c4c5d5;font-size:20px;margin-left:4px;transition:transform .2s;"
              :style="expandedKey===rowKey(row)?'transform:rotate(180deg)':''">
              expand_more
            </span>
          </div>

          <!-- 展开详情 -->
          <div v-if="expandedKey===rowKey(row)" class="m-inv-detail">
            <div class="m-inv-detail-label">库位信息</div>
            <div class="m-inv-detail-row">
              <span class="m-inv-detail-key">当前库存</span>
              <span class="m-inv-detail-val">{{ row.qty }}</span>
            </div>
            <div class="m-inv-detail-row">
              <span class="m-inv-detail-key">预警值</span>
              <span class="m-inv-detail-val">{{ row.alertQty || '未设置' }}</span>
            </div>
            <div class="m-inv-detail-row">
              <span class="m-inv-detail-key">更新时间</span>
              <span class="m-inv-detail-val" style="font-size:12px;">{{ row.updateTime }}</span>
            </div>
            <button class="m-action-btn primary" style="width:100%;justify-content:center;margin-top:8px;border-radius:10px;height:40px;"
              @click="setAlert(row)">
              <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
              设置预警值
            </button>
          </div>
        </div>

        <div v-if="!filteredList.length" class="m-empty">
          <span class="material-symbols-outlined">inventory_2</span>
          <p>暂无库存记录</p>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > query.size" class="m-pagination">
        <button class="m-page-btn" :disabled="query.current<=1" @click="prevPage">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <span class="m-page-info">{{ query.current }} / {{ Math.ceil(total/query.size) }}</span>
        <button class="m-page-btn" :disabled="query.current>=Math.ceil(total/query.size)" @click="nextPage">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <!-- 预警值弹窗（移动端简化版） -->
      <el-dialog title="设置预警值" :visible.sync="alertDialog" width="92%">
        <el-form label-width="80px">
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
    </div>

  </div>
</template>

<script>
import { getInventory, setAlertQty, getInventoryChart } from '../../api/inventory'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import mobileMixin from '../../mixins/mobile'
import InventoryBarChart from '../../components/InventoryBarChart.vue'
export default {
  components: { InventoryBarChart },
  mixins: [mobileMixin],
  data() {
    return {
      list: [], total: 0, loading: false,
      warehouses: [], warehouseMap: {}, productMap: {},
      alertDialog: false, alertForm: {},
      query: { current: 1, size: 10, warehouseId: null },
      mobileSearch: '',
      filterChip: null,
      expandedKey: null,
      viewMode: 'list',
      chartTab: 'all',
      chartWarehouseId: null,
      chartData: [],
      chartLoading: false
    }
  },
  computed: {
    filteredList() {
      let arr = this.list
      if (this.mobileSearch) {
        const kw = this.mobileSearch.toLowerCase()
        arr = arr.filter(r => {
          const name = (this.productMap[r.productId] || '').toLowerCase()
          return name.includes(kw) || String(r.productId).includes(kw)
        })
      }
      if (this.filterChip === 'low')    arr = arr.filter(r => this.isLow(r))
      if (this.filterChip === 'normal') arr = arr.filter(r => !this.isLow(r))
      return arr
    }
  },
  created() {
    this.loadData()
    getWarehouses().then(r => {
      this.warehouses = r.data || []
      this.warehouseMap = Object.fromEntries(this.warehouses.map(w => [w.id, w.name]))
    })
    this.loadAllProducts()
  },
  watch: {
    chartTab(val) { if (this.viewMode === 'chart') this.loadChartData() },
    chartWarehouseId() { if (this.viewMode === 'chart' && this.chartTab === 'warehouse') this.loadChartData() }
  },
  methods: {
    async loadData() {
      this.loading = true
      const r = await getInventory(this.query).finally(() => { this.loading = false })
      this.list  = r.data.records
      this.total = r.data.total
    },
    async switchViewMode(mode) {
      this.viewMode = mode
      if (mode === 'chart') this.loadChartData()
    },
    async loadChartData() {
      this.chartLoading = true
      const params = this.chartTab === 'warehouse' && this.chartWarehouseId
        ? { type: 'warehouse', warehouseId: this.chartWarehouseId }
        : { type: 'all' }
      const r = await getInventoryChart(params).catch(() => ({ data: [] }))
      this.chartData = r.data || []
      this.chartLoading = false
    },
    onWarehouseChange(val) { this.chartWarehouseId = val },
    async loadAllProducts() {
      let current = 1, all = []
      while (true) {
        const r = await getProducts({ current, size: 200 })
        const items = r.data.records || r.data || []
        all.push(...items)
        if (items.length < 200) break
        current++
      }
      this.productMap = Object.fromEntries(all.map(p => [p.id, p.name]))
    },
    onFilter() { this.query.current = 1; this.loadData() },
    prevPage()  { this.query.current--; this.loadData() },
    nextPage()  { this.query.current++; this.loadData() },
    isLow(row)  { return row.alertQty > 0 && row.qty < row.alertQty },
    rowKey(row) { return `${row.productId}_${row.warehouseId}` },
    toggleCard(row) {
      const k = this.rowKey(row)
      this.expandedKey = this.expandedKey === k ? null : k
    },
    setAlert(row) {
      this.alertForm = { warehouseId: row.warehouseId, productId: row.productId, alertQty: row.alertQty }
      this.alertDialog = true
    },
    async saveAlert() {
      await setAlertQty(this.alertForm)
      this.$message.success('预警值已更新')
      this.alertDialog = false
      this.loadData()
    }
  }
}
</script>

<style scoped>
/* 筛选芯片 */
.mi-chips {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.mi-chips::-webkit-scrollbar { display: none; }
.mi-chip {
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid #c4c5d5;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: #757684;
  cursor: pointer;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
  transition: all .15s;
}
.mi-chip.active {
  background: #00288e;
  color: #fff;
  border-color: #00288e;
}
</style>