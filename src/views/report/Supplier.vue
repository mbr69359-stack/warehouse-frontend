<template>
  <div>
    <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
      <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">handshake</span>
      <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">供应商对账单</p>
      <p style="font-size:13px;color:#757684;">请在电脑端查看</p>
    </div>
    <el-card v-else>
      <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:600;">供应商对账单</span>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
          @change="loadData" style="width:240px;" />
        <el-select v-model="filterSupplier" placeholder="全部供应商" clearable filterable style="width:180px;" @change="loadData">
          <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
      </div>

      <el-table :data="tableData" border stripe show-summary :summary-method="getSummary">
        <el-table-column prop="supplierName" label="供应商" min-width="180" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="orderCount" label="入库单数" width="90" align="right" />
        <el-table-column label="入库总量" width="100" align="right">
          <template slot-scope="{row}">{{ row.totalQty }}</template>
        </el-table-column>
        <el-table-column label="入库总金额" width="130" align="right">
          <template slot-scope="{row}">
            <span style="font-weight:600;color:#409EFF;">¥{{ fmt(row.totalAmount) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { getSupplierStatement } from '../../api/report'
import { getSuppliers } from '../../api/supplier'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'

export default {
  mixins: [mobileMixin],
  data() {
    const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - 1)
    return {
      tableData: [], suppliers: [], filterSupplier: null,
      dateRange: [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    }
  },
  created() {
    getSuppliers({ current: 1, size: 500 }).then(r => { this.suppliers = (r.data && r.data.records) || r.data || [] })
    this.loadData()
  },
  methods: {
    fmt(v) { return Number(v || 0).toFixed(2) },
    async loadData() {
      if (!this.dateRange || !this.dateRange[0]) return
      const params = { startDate: this.dateRange[0], endDate: this.dateRange[1] }
      if (this.filterSupplier) params.supplierId = this.filterSupplier
      const res = await getSupplierStatement(params)
      this.tableData = res.data || []
    },
    getSummary({ columns, data }) {
      return columns.map((col, i) => {
        if (i === 0) return '合计'
        if (i === 3) return data.reduce((s, r) => s + Number(r.orderCount || 0), 0)
        if (i === 4) return data.reduce((s, r) => s + Number(r.totalQty || 0), 0)
        if (i === 5) return '¥' + data.reduce((s, r) => s + Number(r.totalAmount || 0), 0).toFixed(2)
        return ''
      })
    },
    handleExport() {
      exportCSV(
        ['供应商', '联系人', '联系电话', '入库单数', '入库总量', '入库总金额(元)'],
        this.tableData.map(r => [r.supplierName, r.contact || '', r.phone || '', r.orderCount, r.totalQty, this.fmt(r.totalAmount)]),
        `供应商对账单_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      )
    }
  }
}
</script>
