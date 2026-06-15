<template>
  <div>
    <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
      <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">broken_image</span>
      <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">破损损耗报表</p>
      <p style="font-size:13px;color:#757684;">请在电脑端查看</p>
    </div>
    <el-card v-else v-loading="loading">
      <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:600;">破损损耗明细表</span>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
          @change="loadData" style="width:240px;" />
        <el-select v-model="warehouseId" placeholder="全部仓库" clearable style="width:150px;" @change="loadData">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
        <span style="color:#999;font-size:12px;">共 {{ tableData.length }} 条</span>
      </div>

      <el-table :data="tableData" border stripe size="small" show-summary :summary-method="getSummary">
        <el-table-column prop="date" label="日期" width="70" />
        <el-table-column prop="productName" label="商品" min-width="150" show-overflow-tooltip />
        <el-table-column prop="warehouseName" label="仓库" width="110" />
        <el-table-column label="破损数" width="90" align="right">
          <template slot-scope="{row}">
            <span style="color:#F56C6C;font-weight:600;">{{ row.damagedQty }}{{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column label="成本价" width="90" align="right">
          <template slot-scope="{row}">KSh {{ fmt(row.costPrice) }}</template>
        </el-table-column>
        <el-table-column label="损耗金额" width="100" align="right">
          <template slot-scope="{row}">
            <span style="color:#F56C6C;">KSh {{ fmt(row.costDeduction) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="好货调拨" width="90" align="right">
          <template slot-scope="{row}">
            <span v-if="row.goodQty" style="color:#67C23A;">{{ row.goodQty }}{{ row.unit }}</span>
            <span v-else style="color:#999;">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="transferWarehouseName" label="调拨仓库" width="110">
          <template slot-scope="{row}">{{ row.transferWarehouseName || '—' }}</template>
        </el-table-column>
        <el-table-column label="零售定价" width="90" align="right">
          <template slot-scope="{row}">
            <span v-if="row.transferPrice">KSh {{ fmt(row.transferPrice) }}</span>
            <span v-else style="color:#999;">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { todayKe, monthsAgoKe } from '../../utils/time'
import { getDamageReport } from '../../api/report'
import { getWarehouses } from '../../api/warehouse'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'
import { money } from '../../utils/format'

export default {
  mixins: [mobileMixin],
  data() {
    return {
      tableData: [], warehouses: [],
      dateRange: [monthsAgoKe(1), todayKe()],
      warehouseId: null,
      loading: false
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data || [] })
    this.loadData()
  },
  methods: {
    fmt: money,
    async loadData() {
      if (!this.dateRange || !this.dateRange[0]) return
      this.loading = true
      const params = { startDate: this.dateRange[0], endDate: this.dateRange[1] }
      if (this.warehouseId) params.warehouseId = this.warehouseId
      try {
        const res = await getDamageReport(params)
        this.tableData = res.data || []
      } catch (e) {
        this.$message.error('加载失败，请重试')
      } finally {
        this.loading = false
      }
    },
    getSummary({ columns, data }) {
      return columns.map((col, i) => {
        if (i === 0) return '合计'
        const sumMap = { 3: 'damagedQty', 5: 'costDeduction', 6: 'goodQty' }
        if (!sumMap[i]) return ''
        const sum = data.reduce((s, r) => s + Number(r[sumMap[i]] || 0), 0)
        return i === 5 ? 'KSh ' + sum.toFixed(2) : sum
      })
    },
    handleExport() {
      exportCSV(
        ['日期', '商品', '仓库', '破损数', '单位', '成本价', '损耗金额', '好货调拨', '调拨仓库', '零售定价'],
        this.tableData.map(r => [
          r.date, r.productName, r.warehouseName,
          r.damagedQty, r.unit, this.fmt(r.costPrice),
          this.fmt(r.costDeduction), r.goodQty || 0,
          r.transferWarehouseName || '', r.transferPrice ? this.fmt(r.transferPrice) : ''
        ]),
        `破损损耗报表_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      )
    }
  }
}
</script>