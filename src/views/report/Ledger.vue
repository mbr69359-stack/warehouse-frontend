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
        <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
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
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'
import ReportShell from '../../components/report/ReportShell.vue'

const TYPE_LABEL = {
  inbound: '入库', outbound: '出库', adjust: '库存调整',
  transfer: '调拨(出)', transfer_in: '调拨(入)', opening: '期初',
  inbound_cancel: '入库撤销', outbound_cancel: '出库撤销', transfer_cancel: '调拨撤销'
}
const TYPE_TAG = {
  inbound: 'success', outbound: 'danger', adjust: 'warning',
  transfer: '', transfer_in: 'success', opening: 'info',
  inbound_cancel: 'info', outbound_cancel: 'info', transfer_cancel: 'info'
}

export default {
  mixins: [mobileMixin],
  components: { ReportShell },
  computed: {
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
    handleExport() {
      const filename = `流水报表_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      exportCSV(
        ['时间', '仓库', '商品名称', 'SKU', '记账单位', '类型', '变动数量', '单据号', '操作人', '备注'],
        this.tableData.map(r => [
          r.occurredAt, r.warehouseName, r.productName, r.skuCode,
          (r.qtyUnit || 'PIECE') === 'BOX' ? '箱' : '个',
          TYPE_LABEL[r.type] || r.type, this.formatChangeQty(r), r.documentNo || '', r.operator || '', r.note || ''
        ]),
        filename
      )
    }
  }
}
</script>
