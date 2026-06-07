<template>
  <el-card>
    <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <span style="font-weight:600;">毛利报表</span>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
        @change="loadData" style="width:240px;" />
      <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
    </div>

    <el-row :gutter="16" style="margin-bottom:20px;">
      <el-col :span="6">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">销售额</div>
          <div style="font-size:22px;font-weight:700;color:#409EFF;margin-top:4px;">¥{{ fmt(totals.revenue) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">销售成本</div>
          <div style="font-size:22px;font-weight:700;color:#E6A23C;margin-top:4px;">¥{{ fmt(totals.cogs) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">损失合计</div>
          <div style="font-size:22px;font-weight:700;color:#F56C6C;margin-top:4px;">¥{{ fmt(totals.totalLoss) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">毛利润</div>
          <div :style="{ fontSize:'22px', fontWeight:'700', marginTop:'4px', color: totals.grossProfit >= 0 ? '#67C23A' : '#F56C6C' }">
            ¥{{ fmt(totals.grossProfit) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="tableData" border stripe show-summary :summary-method="getSummary" v-loading="loading">
      <el-table-column prop="statDate" label="日期" width="120" />
      <el-table-column label="销售额" align="right" width="130">
        <template slot-scope="{row}"><span style="color:#409EFF;">¥{{ fmt(row.revenue) }}</span></template>
      </el-table-column>
      <el-table-column label="销售成本" align="right" width="130">
        <template slot-scope="{row}">¥{{ fmt(row.cogs) }}</template>
      </el-table-column>
      <el-table-column label="退换货损失" align="right" width="130">
        <template slot-scope="{row}"><span style="color:#E6A23C;">¥{{ fmt(row.replacementLoss) }}</span></template>
      </el-table-column>
      <el-table-column label="损坏损失" align="right" width="130">
        <template slot-scope="{row}"><span style="color:#F56C6C;">¥{{ fmt(row.damageLoss) }}</span></template>
      </el-table-column>
      <el-table-column label="毛利润" align="right" width="140">
        <template slot-scope="{row}">
          <span :style="{ fontWeight:'600', color: grossProfit(row) >= 0 ? '#67C23A' : '#F56C6C' }">
            ¥{{ fmt(grossProfit(row)) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="毛利率" align="right" width="100">
        <template slot-scope="{row}">
          <span :style="{ color: grossMargin(row) >= 0 ? '#67C23A' : '#F56C6C' }">
            {{ grossMargin(row) }}%
          </span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import { getGrossProfitReport } from '../../api/report'
import { exportCSV } from '../../utils/export'

export default {
  data() {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    return {
      loading: false,
      tableData: [],
      dateRange: [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    }
  },
  computed: {
    totals() {
      const revenue = this.tableData.reduce((s, r) => s + Number(r.revenue || 0), 0)
      const cogs = this.tableData.reduce((s, r) => s + Number(r.cogs || 0), 0)
      const replacementLoss = this.tableData.reduce((s, r) => s + Number(r.replacementLoss || 0), 0)
      const damageLoss = this.tableData.reduce((s, r) => s + Number(r.damageLoss || 0), 0)
      const totalLoss = replacementLoss + damageLoss
      const grossProfit = revenue - cogs - totalLoss
      return { revenue, cogs, replacementLoss, damageLoss, totalLoss, grossProfit }
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    fmt(v) { return Number(v || 0).toFixed(2) },
    grossProfit(row) {
      return Number(row.revenue || 0) - Number(row.cogs || 0) - Number(row.replacementLoss || 0) - Number(row.damageLoss || 0)
    },
    grossMargin(row) {
      const rev = Number(row.revenue || 0)
      if (rev === 0) return '0.00'
      return (this.grossProfit(row) / rev * 100).toFixed(2)
    },
    async loadData() {
      if (!this.dateRange || !this.dateRange[0]) return
      this.loading = true
      try {
        const res = await getGrossProfitReport({ startDate: this.dateRange[0], endDate: this.dateRange[1] })
        this.tableData = res.data || []
      } finally {
        this.loading = false
      }
    },
    getSummary({ columns, data }) {
      return columns.map((col, i) => {
        if (i === 0) return '合计'
        const keys = ['revenue', 'cogs', 'replacementLoss', 'damageLoss']
        if (i >= 1 && i <= 4) {
          const sum = data.reduce((s, r) => s + Number(r[keys[i - 1]] || 0), 0)
          return '¥' + sum.toFixed(2)
        }
        if (i === 5) {
          const gp = data.reduce((s, r) => s + this.grossProfit(r), 0)
          return '¥' + gp.toFixed(2)
        }
        if (i === 6) {
          const rev = data.reduce((s, r) => s + Number(r.revenue || 0), 0)
          if (rev === 0) return '0.00%'
          const gp = data.reduce((s, r) => s + this.grossProfit(r), 0)
          return (gp / rev * 100).toFixed(2) + '%'
        }
        return ''
      })
    },
    handleExport() {
      exportCSV(
        ['日期', '销售额', '销售成本', '退换货损失', '损坏损失', '毛利润', '毛利率'],
        this.tableData.map(r => [
          r.statDate,
          this.fmt(r.revenue),
          this.fmt(r.cogs),
          this.fmt(r.replacementLoss),
          this.fmt(r.damageLoss),
          this.fmt(this.grossProfit(r)),
          this.grossMargin(r) + '%'
        ]),
        `毛利报表_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      )
    }
  }
}
</script>