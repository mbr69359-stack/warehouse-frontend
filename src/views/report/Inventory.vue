<template>
  <div>

    <!-- ── 桌面端 ── -->
    <div v-if="!isMobile">
      <!-- 汇总卡片 -->
      <el-row class="no-print" :gutter="20" style="margin-bottom:20px;">
        <el-col :span="8"><el-card shadow="hover" style="text-align:center;">
          <div style="font-size:36px;font-weight:bold;color:#409EFF;">{{ summary.totalSkus||0 }}</div>
          <div style="color:#909399;margin-top:8px;">商品种类（SKU）</div>
        </el-card></el-col>
        <el-col :span="8"><el-card shadow="hover" style="text-align:center;">
          <div style="font-size:36px;font-weight:bold;color:#67C23A;">{{ displayMode === 'box' ? summaryBoxDisplay : (summary.totalQty||0) }}</div>
          <div style="color:#909399;margin-top:8px;">总库存（{{ displayMode === 'box' ? '箱' : '个' }}）</div>
        </el-card></el-col>
        <el-col :span="8"><el-card shadow="hover" style="text-align:center;">
          <div style="font-size:36px;font-weight:bold;color:#F56C6C;">{{ summary.alertCount||0 }}</div>
          <div style="color:#909399;margin-top:8px;">库存预警数</div>
        </el-card></el-col>
      </el-row>

      <el-card>
        <div class="no-print" style="margin-bottom:16px;display:flex;gap:12px;align-items:center;">
          <template v-if="viewMode === 'list'">
            <el-select v-model="query.warehouseId" placeholder="全部仓库" clearable style="width:150px;" @change="onFilter">
              <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
            </el-select>
            <el-button type="primary" icon="el-icon-search" @click="onFilter">搜索</el-button>
            <el-radio-group v-model="displayMode" size="small" style="margin-left:8px;">
              <el-radio-button label="box">按箱查看</el-radio-button>
              <el-radio-button label="piece">按个查看</el-radio-button>
            </el-radio-group>
          </template>
          <div style="margin-left:auto;display:flex;gap:8px;">
            <el-button v-if="viewMode === 'list'" type="success" icon="el-icon-download" :loading="exporting" @click="handleExport">导出 Excel</el-button>
            <el-button v-if="viewMode === 'list'" icon="el-icon-printer" @click="handlePrint">打印</el-button>
            <el-button icon="el-icon-upload2" @click="importDialog=true">导入期初库存</el-button>
            <el-button-group>
              <el-button :type="viewMode==='list'?'primary':''" icon="el-icon-menu" @click="switchViewMode('list')">列表</el-button>
              <el-button :type="viewMode==='chart'?'primary':''" icon="el-icon-data-analysis" @click="switchViewMode('chart')">图表</el-button>
            </el-button-group>
          </div>
        </div>

        <!-- 导入期初库存弹窗 -->
        <el-dialog title="导入期初库存" :visible.sync="importDialog" width="480px" @closed="resetImport">
          <div style="margin-bottom:12px;color:#909399;font-size:13px;">
            Excel 需包含列：<b>SKU码</b>、<b>仓库名称</b>、<b>数量</b>，与系统中完全一致。
            <el-button type="text" @click="downloadTemplate" style="padding:0 4px;">下载模板</el-button>
          </div>
          <el-upload drag action="" :auto-upload="false" :on-change="onFileChange" :file-list="fileList"
            accept=".xlsx,.xls" :limit="1" :on-exceed="() => $message.warning('只能上传一个文件')">
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">拖拽文件到此处，或 <em>点击上传</em></div>
            <div class="el-upload__tip" slot="tip">仅支持 .xlsx / .xls 文件</div>
          </el-upload>
          <div v-if="importResult" style="margin-top:16px;">
            <el-alert :title="`导入完成：成功 ${importResult.successCount} 行，失败 ${importResult.failCount} 行`"
              :type="importResult.failCount > 0 ? 'warning' : 'success'" show-icon :closable="false" />
            <div v-if="importResult.failDetails && importResult.failDetails.length" style="margin-top:8px;max-height:160px;overflow-y:auto;">
              <div v-for="d in importResult.failDetails" :key="d" style="font-size:12px;color:#F56C6C;line-height:1.8;">{{ d }}</div>
            </div>
          </div>
          <div slot="footer">
            <el-button @click="importDialog=false">关闭</el-button>
            <el-button type="primary" :loading="importing" :disabled="!importFile" @click="doImport">开始导入</el-button>
          </div>
        </el-dialog>

        <!-- 图表视图 -->
        <div v-if="viewMode === 'chart'">
          <el-tabs v-model="chartTab">
            <el-tab-pane label="全部库存" name="all" />
            <el-tab-pane label="按仓库查看" name="warehouse" />
          </el-tabs>
          <div v-loading="chartLoading">
            <inventory-bar-chart
              :chart-data="enrichedChartData"
              :unit="displayMode"
              :title="chartTab === 'all' ? '全部商品库存' : ''"
              :warehouses="warehouses"
              :show-warehouse-select="chartTab === 'warehouse'"
              height="380px"
              @warehouse-change="onWarehouseChange" />
          </div>
        </div>

        <!-- 列表视图 -->
        <el-table v-if="viewMode === 'list'" class="no-print" :data="list" v-loading="loading" border stripe>
          <el-table-column label="仓库" min-width="120">
            <template slot-scope="{row}">{{ warehouseMap[row.warehouseId]?.name || row.warehouseId }}</template>
          </el-table-column>
          <el-table-column label="商品" min-width="160">
            <template slot-scope="{row}">{{ productMap[row.productId]?.name || row.productId }}</template>
          </el-table-column>
          <el-table-column label="当前库存" width="130" align="center">
            <template slot-scope="{row}">{{ formatQty(row) }}</template>
          </el-table-column>
          <el-table-column label="预警值" width="110" align="center">
            <template slot-scope="{row}">{{ formatAlert(row) }}</template>
          </el-table-column>
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
        <el-pagination v-if="viewMode === 'list'" class="no-print" style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
          :total="total" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />

        <!-- 打印区域：屏幕隐藏，仅打印时显示，渲染全量库存 -->
        <div class="print-only">
          <h2 style="text-align:center;margin:0 0 4px;">库存报表</h2>
          <p style="text-align:center;margin:0 0 12px;font-size:13px;color:#555;">
            仓库：{{ printWarehouseName }} &nbsp;&nbsp; 日期：{{ todayStr }}
          </p>
          <table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr>
                <th>仓库</th><th>商品</th><th>当前库存</th><th>预警值</th><th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in printList" :key="row.productId+'_'+row.warehouseId">
                <td>{{ warehouseMap[row.warehouseId] && warehouseMap[row.warehouseId].name || row.warehouseId }}</td>
                <td>{{ productMap[row.productId] && productMap[row.productId].name || row.productId }}</td>
                <td>{{ formatQty(row) }}</td>
                <td>{{ formatAlert(row) }}</td>
                <td>{{ row.alertQty > 0 && row.qty < row.alertQty ? '库存不足' : '正常' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <el-dialog title="设置预警值" :visible.sync="alertDialog" width="360px">
          <el-form label-width="90px">
            <el-form-item label="商品">
              <el-input :value="productMap[alertForm.productId]?.name || alertForm.productId" disabled />
            </el-form-item>
            <el-form-item label="单位">
              <el-radio-group v-model="alertUnit" size="small" @change="onAlertUnitChange">
                <el-radio-button label="piece">按个</el-radio-button>
                <el-radio-button label="box" :disabled="!alertBoxAllowed">按箱</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item :label="alertUnit === 'box' ? '预警箱数' : '预警库存'">
              <el-input-number v-model="alertForm.alertQty" :min="0" style="width:100%;" />
              <div v-if="alertUnit === 'box'" style="font-size:12px;color:#909399;line-height:1.6;">
                = {{ (alertForm.alertQty || 0) * alertQtyPerBox }} 个（每箱 {{ alertQtyPerBox }} 个）
              </div>
            </el-form-item>
          </el-form>
          <div slot="footer">
            <el-button @click="alertDialog=false">取消</el-button>
            <el-button type="primary" @click="saveAlert">保存</el-button>
          </div>
        </el-dialog>
      </el-card>
    </div>

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
              <div class="m-inv-name">{{ productMap[row.productId]?.name || ('商品 #'+row.productId) }}</div>
              <div class="m-inv-sub">仓库: {{ warehouseMap[row.warehouseId]?.name || row.warehouseId }}</div>
            </div>
            <div class="m-inv-nums">
              <div class="m-inv-num-block">
                <div class="m-inv-num-label">总库存</div>
                <div class="m-inv-num-val" :class="isLow(row)?'warn':''">{{ formatQty(row) }}</div>
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
              <span class="m-inv-detail-val">{{ formatQty(row) }}</span>
            </div>
            <div class="m-inv-detail-row">
              <span class="m-inv-detail-key">预警值</span>
              <span class="m-inv-detail-val">{{ formatAlert(row) }}</span>
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
            <el-input :value="productMap[alertForm.productId]?.name || alertForm.productId" disabled />
          </el-form-item>
          <el-form-item label="单位">
            <el-radio-group v-model="alertUnit" size="small" @change="onAlertUnitChange">
              <el-radio-button label="piece">按个</el-radio-button>
              <el-radio-button label="box" :disabled="!alertBoxAllowed">按箱</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="alertUnit === 'box' ? '预警箱数' : '预警库存'">
            <el-input-number v-model="alertForm.alertQty" :min="0" style="width:100%;" />
            <div v-if="alertUnit === 'box'" style="font-size:12px;color:#909399;line-height:1.6;">
              = {{ (alertForm.alertQty || 0) * alertQtyPerBox }} 个（每箱 {{ alertQtyPerBox }} 个）
            </div>
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
import { getInventory, setAlertQty, getInventoryChart, importInventory, downloadImportTemplate, exportInventory } from '../../api/inventory'
import { getInventorySummary } from '../../api/report'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import mobileMixin from '../../mixins/mobile'
import InventoryBarChart from '../../components/InventoryBarChart.vue'
export default {
  components: { InventoryBarChart },
  mixins: [mobileMixin],
  data() {
    return {
      summary: {},
      list: [], total: 0, loading: false,
      warehouses: [], warehouseMap: {},
      productMap: {},
      alertDialog: false, alertForm: {},
      alertUnit: 'piece', alertQtyPerBox: 0, alertBoxAllowed: false,
      query: { current: 1, size: 10, warehouseId: null },
      mobileSearch: '',
      filterChip: null,
      expandedKey: null,
      viewMode: 'list',
      chartTab: 'all',
      chartWarehouseId: null,
      chartData: [],
      chartLoading: false,
      importDialog: false,
      importing: false,
      importFile: null,
      fileList: [],
      importResult: null,
      exporting: false,
      printList: []
    }
  },
  computed: {
    displayMode: {
      get() { return this.$store.state.displayUnit },
      set(v) { this.$store.commit('SET_DISPLAY_UNIT', v) }
    },
    enrichedChartData() {
      return (this.chartData || []).map(d => ({
        ...d,
        qtyPerBox: this.productMap[d.productId]?.qtyPerBox || 0
      }))
    },
    todayStr() { return new Date().toISOString().slice(0, 10) },
    printWarehouseName() {
      if (!this.query.warehouseId) return '全部仓库'
      const w = this.warehouseMap[this.query.warehouseId]
      return (w && w.name) || this.query.warehouseId
    },
    summaryBoxDisplay() {
      const boxes = Number(this.summary.totalBoxCount || 0)
      const loose = Number(this.summary.looseCount || 0)
      if (boxes <= 0) return `${loose}个`
      if (loose > 0) return `${boxes}箱零${loose}个`
      return `${boxes}箱`
    },
    filteredList() {
      let arr = this.list
      if (this.mobileSearch) {
        const kw = this.mobileSearch.toLowerCase()
        arr = arr.filter(r => {
          const name = (this.productMap[r.productId]?.name || '').toLowerCase()
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
      this.warehouseMap = Object.fromEntries(this.warehouses.map(w => [w.id, w]))
    })
    this.loadAllProducts()
  },
  watch: {
    chartTab() { if (this.viewMode === 'chart') this.loadChartData() },
    chartWarehouseId() { if (this.viewMode === 'chart' && this.chartTab === 'warehouse') this.loadChartData() }
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [sumRes, invRes] = await Promise.all([
          getInventorySummary({ warehouseId: this.query.warehouseId }),
          getInventory(this.query)
        ])
        this.summary = sumRes.data || {}
        this.list  = invRes.data.records || []
        this.total = invRes.data.total || 0
      } finally {
        this.loading = false
      }
    },
    async handleExport() {
      this.exporting = true
      try {
        const res = await exportInventory({ warehouseId: this.query.warehouseId })
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = '库存报表_' + new Date().toISOString().slice(0, 10) + '.xlsx'
        a.click()
        window.URL.revokeObjectURL(url)
      } catch {
        this.$message.error('导出失败，请稍后重试')
      } finally {
        this.exporting = false
      }
    },
    async handlePrint() {
      const r = await getInventory({ current: 1, size: 10000, warehouseId: this.query.warehouseId })
      this.printList = r.data.records || []
      this.$nextTick(() => window.print())
    },
    async switchViewMode(mode) {
      this.viewMode = mode
      this.query.current = 1
      if (mode === 'chart') this.loadChartData()
      else this.loadData()
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
      this.productMap = Object.fromEntries(all.map(p => [p.id, p]))
    },
    formatQty(row) {
      const wh = this.warehouseMap[row.warehouseId]
      const prod = this.productMap[row.productId]
      const qty = Number(row.qty) || 0
      const qtyPerBox = prod?.qtyPerBox
      if (this.displayMode === 'piece') return `${qty} 个`
      if (wh?.type === 'PIECE') return `${qty} 个`
      if (!qtyPerBox) return `${qty} 箱 ⚠️`
      const boxes = Math.floor(qty / qtyPerBox)
      const loose = qty % qtyPerBox
      return loose > 0 ? `${boxes}箱 ${loose}个` : `${boxes}箱`
    },
    formatAlert(row) {
      const qty = Number(row.alertQty) || 0
      if (!qty) return '未设置'
      const wh = this.warehouseMap[row.warehouseId]
      const qtyPerBox = this.productMap[row.productId]?.qtyPerBox
      if (this.displayMode === 'piece' || wh?.type === 'PIECE' || !qtyPerBox) return `${qty} 个`
      const boxes = Math.floor(qty / qtyPerBox)
      const loose = qty % qtyPerBox
      if (!boxes) return `${qty} 个`
      return loose > 0 ? `${boxes}箱 ${loose}个` : `${boxes}箱`
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
      const wh = this.warehouseMap[row.warehouseId]
      const qpb = Number(this.productMap[row.productId]?.qtyPerBox) || 0
      this.alertQtyPerBox = qpb
      this.alertBoxAllowed = qpb > 0 && wh?.type !== 'PIECE'
      const cur = Number(row.alertQty) || 0
      // 按箱查看模式下且现有预警值为整箱时，默认按箱编辑
      const useBox = this.alertBoxAllowed && this.displayMode === 'box' && cur % qpb === 0
      this.alertUnit = useBox ? 'box' : 'piece'
      this.alertForm = {
        warehouseId: row.warehouseId,
        productId: row.productId,
        alertQty: useBox ? cur / qpb : cur
      }
      this.alertDialog = true
    },
    onAlertUnitChange(unit) {
      const qpb = this.alertQtyPerBox
      if (!qpb) return
      const v = Number(this.alertForm.alertQty) || 0
      this.alertForm.alertQty = unit === 'box' ? Math.floor(v / qpb) : v * qpb
    },
    async saveAlert() {
      const v = Number(this.alertForm.alertQty) || 0
      const pieces = this.alertUnit === 'box' ? v * this.alertQtyPerBox : v
      await setAlertQty({ ...this.alertForm, alertQty: pieces })
      this.$message.success('预警值已更新')
      this.alertDialog = false
      this.loadData()
    },
    onFileChange(file) { this.importFile = file.raw; this.importResult = null },
    resetImport() { this.importFile = null; this.fileList = []; this.importResult = null },
    async doImport() {
      if (!this.importFile) return
      this.importing = true
      try {
        const r = await importInventory(this.importFile)
        this.importResult = r.data
        if (r.data.failCount === 0) {
          this.$message.success(`导入成功，共 ${r.data.successCount} 行`)
          this.loadData()
        }
      } catch (e) {
        this.$message.error('导入失败')
      } finally {
        this.importing = false
      }
    },
    async downloadTemplate() {
      const r = await downloadImportTemplate()
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = '期初库存导入模板.xlsx'; a.click()
      URL.revokeObjectURL(url)
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

<style>
.print-only { display: none; }
@media print {
  .el-aside, .el-header, .el-card__header { display: none !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
}
</style>
