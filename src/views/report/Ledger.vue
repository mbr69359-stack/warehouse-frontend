<template>
  <report-shell mobile-icon="receipt_long" title="流水报表">
    <template #toolbar>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
          @change="loadData" style="width:240px;" />
        <el-select v-model="filterType" placeholder="全部类型" clearable style="width:130px;" @change="loadData">
          <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        <el-select v-model="filterWarehouse" placeholder="全部仓库" clearable style="width:130px;" @change="loadData">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-radio-group v-model="displayMode" size="small">
          <el-radio-button label="box">按箱</el-radio-button>
          <el-radio-button label="piece">按个</el-radio-button>
        </el-radio-group>
        <el-button icon="el-icon-download" :loading="exporting" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
        <el-button v-if="isAdmin" type="warning" icon="el-icon-refresh-left" :loading="rebuilding" @click="handleRebuild">重算快照</el-button>
        <span style="color:#999;font-size:12px;">共 {{ tableData.length }} 条</span>
    </template>
    <el-table :data="tableData" border stripe size="small" style="width:100%;">
        <el-table-column prop="occurredAt" label="时间" width="135" />
        <el-table-column prop="warehouseName" label="仓库" width="100" />
        <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="skuCode" label="SKU" width="120" />
        <el-table-column label="类型" width="100">
          <template slot-scope="{row}">
            <el-tag :type="typeTagMap[row.type] || 'info'" size="mini">{{ typeLabelMap[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变动数量" width="130" align="right">
          <template slot-scope="{row}">
            <span :style="{ color: row.changeQty > 0 ? '#67C23A' : '#F56C6C', fontWeight: 600 }">
              {{ formatChangeQty(row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="记账单位" width="85" align="center">
          <template slot-scope="{row}">
            <el-tag :type="(row.qtyUnit || 'PIECE') === 'BOX' ? 'warning' : 'success'" size="mini">
              {{ (row.qtyUnit || 'PIECE') === 'BOX' ? '箱' : '个' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="documentNo" label="单据号" width="150" show-overflow-tooltip />
        <el-table-column prop="operator" label="操作人" width="90" />
        <el-table-column prop="note" label="备注" min-width="120" show-overflow-tooltip />
      </el-table>
  </report-shell>
</template>

<script>
import { todayKe, daysAgoKe } from '../../utils/time'
import { getLedgerReport } from '../../api/report'
import { rebuildSnapshot, exportLedger } from '../../api/ledger'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import mobileMixin from '../../mixins/mobile'
import ReportShell from '../../components/report/ReportShell.vue'

const TYPE_LABEL = {
  inbound: '入库', outbound: '出库', adjust: '库存调整',
  transfer: '调拨(出)', transfer_in: '调拨(入)', opening: '期初',
  inbound_cancel: '入库撤销', outbound_cancel: '出库撤销', transfer_cancel: '调拨撤销',
  damage_out: '损坏出库', replacement_out: '补发出库'
}
const TYPE_TAG = {
  inbound: 'success', outbound: 'danger', adjust: 'warning',
  transfer: '', transfer_in: 'success', opening: 'info',
  inbound_cancel: 'info', outbound_cancel: 'info', transfer_cancel: 'info',
  damage_out: 'warning', replacement_out: 'danger'
}

export default {
  mixins: [mobileMixin],
  components: { ReportShell },
  computed: {
    isAdmin() { return this.$store.getters.isAdmin },
    displayMode: {
      get() { return this.$store.state.displayUnit },
      set(v) { this.$store.commit('SET_DISPLAY_UNIT', v) }
    }
  },
  data() {
    return {
      tableData: [], warehouses: [], productMap: {}, warehouseMap: {},
      dateRange: [daysAgoKe(29), todayKe()],
      filterType: '', filterWarehouse: null,
      rebuilding: false, exporting: false,
      typeLabelMap: TYPE_LABEL, typeTagMap: TYPE_TAG,
      typeOptions: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))
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
      if (!this.dateRange || !this.dateRange[0]) return
      const params = { startDate: this.dateRange[0], endDate: this.dateRange[1] }
      if (this.filterType) params.type = this.filterType
      if (this.filterWarehouse) params.warehouseId = this.filterWarehouse
      const res = await getLedgerReport(params)
      this.tableData = res.data || []
    },
    formatChangeQty(row) {
      const qty = Number(row.changeQty) || 0
      const qtyUnit = row.qtyUnit || 'PIECE'
      const whType = row.warehouseType || this.warehouseMap[row.warehouseId]?.type
      const qtyPerBox = Number(row.qtyPerBox || this.productMap[row.productId]?.qtyPerBox) || 0
      const sign = qty >= 0 ? '+' : ''
      if (this.displayMode === 'piece') {
        if (qtyUnit === 'BOX') {
          if (!qtyPerBox) return `${sign}${qty} 箱⚠️`
          return `${sign}${qty * qtyPerBox} 个`
        }
        return `${sign}${qty} 个`
      } else {
        if (whType === 'PIECE') return `${sign}${qty} 个`
        if (qtyUnit === 'BOX') return `${sign}${qty} 箱`
        if (!qtyPerBox) return `${sign}${qty} 个⚠️`
        const abs = Math.abs(qty)
        const prefix = qty < 0 ? '-' : '+'
        const boxes = Math.floor(abs / qtyPerBox)
        const loose = abs % qtyPerBox
        if (boxes === 0) return `${prefix}${loose} 个`
        return loose > 0 ? `${prefix}${boxes}箱零${loose}个` : `${prefix}${boxes}箱`
      }
    },
    async handleExport() {
      this.exporting = true
      try {
        const params = { startDate: this.dateRange[0], endDate: this.dateRange[1] }
        if (this.filterType) params.type = this.filterType
        if (this.filterWarehouse) params.locationId = this.filterWarehouse
        const res = await exportLedger(params)
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = `流水报表_${this.dateRange[0]}_${this.dateRange[1]}.xlsx`
        a.click()
        window.URL.revokeObjectURL(url)
      } catch {
        this.$message.error('导出失败，请稍后重试')
      } finally {
        this.exporting = false
      }
    },
    async handleRebuild() {
      await this.$confirm('将从流水重算所有快照，确认执行？', '提示', { type: 'warning' })
      this.rebuilding = true
      try {
        await rebuildSnapshot()
        this.$message.success('快照重算完成')
        this.loadData()
      } finally {
        this.rebuilding = false
      }
    }
  }
}
</script>
