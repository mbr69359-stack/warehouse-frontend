<template>
  <div>
  <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
    <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">inventory_2</span>
    <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">库存报表</p>
    <p style="font-size:13px;color:#757684;">功能建设中，请在电脑端查看</p>
  </div>
  <div v-else>
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
      <div slot="header" style="display:flex;gap:12px;align-items:center;">
        <span>库存明细</span>
        <el-select v-model="warehouseId" placeholder="全部仓库" clearable style="width:160px;" @change="loadData">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-radio-group v-model="displayMode" size="small">
          <el-radio-button label="piece">按个</el-radio-button>
          <el-radio-button label="box">按箱</el-radio-button>
        </el-radio-group>
        <el-button type="success" icon="el-icon-download" :loading="exporting" @click="handleExport">导出 Excel</el-button>
        <el-button icon="el-icon-printer" @click="handlePrint">打印</el-button>
      </div>
      <el-table class="no-print" :data="list" v-loading="loading" border stripe>
        <el-table-column label="仓库" min-width="120">
          <template slot-scope="{row}">{{ (warehouseMap[row.warehouseId] && warehouseMap[row.warehouseId].name) || row.warehouseId }}</template>
        </el-table-column>
        <el-table-column label="商品" min-width="160">
          <template slot-scope="{row}">{{ (productMap[row.productId] && productMap[row.productId].name) || row.productId }}</template>
        </el-table-column>
        <el-table-column label="当前库存" width="120" align="center">
          <template slot-scope="{row}">{{ fmtQty(row) }}</template>
        </el-table-column>
        <el-table-column prop="alertQty" label="预警值" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template slot-scope="{row}">
            <el-tag v-if="row.alertQty > 0 && row.qty < row.alertQty" type="danger">预警</el-tag>
            <el-tag v-else type="success">正常</el-tag>
          </template>
        </el-table-column>
      </el-table>

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
              <td>{{ (warehouseMap[row.warehouseId] && warehouseMap[row.warehouseId].name) || row.warehouseId }}</td>
              <td>{{ (productMap[row.productId] && productMap[row.productId].name) || row.productId }}</td>
              <td>{{ fmtQty(row) }}</td>
              <td>{{ row.alertQty }}</td>
              <td>{{ row.alertQty > 0 && row.qty < row.alertQty ? '预警' : '正常' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </el-card>
  </div>
  </div>
</template>

<script>
import { getInventory, exportInventory } from '../../api/inventory'
import { getInventorySummary } from '../../api/report'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import mobileMixin from '../../mixins/mobile'
export default {
  mixins: [mobileMixin],
  data() {
    return {
      summary: {}, list: [], loading: false,
      warehouses: [], warehouseId: null,
      warehouseMap: {}, productMap: {},
      displayMode: 'piece',
      exporting: false, printList: []
    }
  },
  computed: {
    todayStr() { return new Date().toISOString().slice(0, 10) },
    printWarehouseName() {
      if (!this.warehouseId) return '全部仓库'
      const w = this.warehouseMap[this.warehouseId]
      return (w && w.name) || this.warehouseId
    },
    summaryBoxDisplay() {
      const boxes = Number(this.summary.totalBoxCount || 0)
      const loose = Number(this.summary.looseCount || 0)
      if (boxes <= 0) return `${loose}\u4e2a`
      if (loose > 0) return `${boxes}\u7bb1\u96f6${loose}\u4e2a`
      return `${boxes}\u7bb1`
    }
  },
  created() {
    getWarehouses().then(r => {
      this.warehouses = r.data || []
      this.warehouseMap = Object.fromEntries(this.warehouses.map(w => [w.id, w]))
    })
    getProducts({ size: 1000 }).then(r => {
      const items = r.data.records || r.data || []
      this.productMap = Object.fromEntries(items.map(p => [p.id, p]))
    })
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      const [sumRes, invRes] = await Promise.all([
        getInventorySummary({ warehouseId: this.warehouseId }),
        getInventory({ current: 1, size: 200, warehouseId: this.warehouseId })
      ]).finally(() => { this.loading = false })
      this.summary = sumRes.data || {}
      this.list = invRes.data.records || []
    },
    async handleExport() {
      this.exporting = true
      try {
        const res = await exportInventory({ warehouseId: this.warehouseId })
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
      const r = await getInventory({ current: 1, size: 10000, warehouseId: this.warehouseId })
      this.printList = r.data.records || []
      this.$nextTick(() => window.print())
    },
    fmtQty(row) {
      const qty = Number(row.qty || 0)
      if (this.displayMode === 'piece') return qty + '个'
      const wh = this.warehouseMap[row.warehouseId]
      const prod = this.productMap[row.productId]
      if (wh && wh.type === 'BOX' && prod && prod.qtyPerBox > 0) {
        const boxes = Math.floor(qty / prod.qtyPerBox)
        const rem = qty % prod.qtyPerBox
        return boxes > 0 ? (rem > 0 ? `${boxes}箱${rem}个` : `${boxes}箱`) : `${rem}个`
      }
      return qty + '个'
    }
  }
}
</script>

<style>
.print-only { display: none; }
@media print {
  .el-aside, .el-header, .el-card__header { display: none !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
}
</style>
