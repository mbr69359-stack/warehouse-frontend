<template>
  <el-card>
    <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <span style="font-weight:600;">净利润报表</span>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
        @change="loadData" style="width:240px;" />
      <el-select v-model="warehouseId" placeholder="全部仓库" clearable style="width:130px;" @change="loadData">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
      <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
    </div>

    <!-- 汇总卡片 -->
    <el-row :gutter="12" style="margin-bottom:20px;">
      <el-col :span="6">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">销售额</div>
          <div style="font-size:20px;font-weight:700;color:#409EFF;margin-top:4px;">KSh {{ fmt(totals.revenue) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">毛利润</div>
          <div :style="{ fontSize:'20px', fontWeight:'700', marginTop:'4px', color: totals.grossProfit >= 0 ? '#67C23A' : '#F56C6C' }">
            KSh {{ fmt(totals.grossProfit) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">总运营费用</div>
          <div style="font-size:20px;font-weight:700;color:#E6A23C;margin-top:4px;">KSh {{ fmt(totals.totalExpense) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">净利润</div>
          <div :style="{ fontSize:'20px', fontWeight:'700', marginTop:'4px', color: totals.netProfit >= 0 ? '#67C23A' : '#F56C6C' }">
            KSh {{ fmt(totals.netProfit) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="tableData" border stripe show-summary :summary-method="getSummary"
      v-loading="loading" style="width:100%;">
      <el-table-column prop="statDate" label="日期" width="110" fixed />

      <el-table-column label="销售额" align="right" width="125">
        <template slot-scope="{row}"><span style="color:#409EFF;">KSh {{ fmt(row.revenue) }}</span></template>
      </el-table-column>
      <el-table-column label="销售成本" align="right" width="120">
        <template slot-scope="{row}">KSh {{ fmt(row.cogs) }}</template>
      </el-table-column>
      <el-table-column label="退换货损失" align="right" width="120">
        <template slot-scope="{row}"><span style="color:#E6A23C;">KSh {{ fmt(row.replacementLoss) }}</span></template>
      </el-table-column>
      <el-table-column label="损坏损失" align="right" width="110">
        <template slot-scope="{row}"><span style="color:#F56C6C;">KSh {{ fmt(row.damageLoss) }}</span></template>
      </el-table-column>
      <el-table-column label="毛利润" align="right" width="125">
        <template slot-scope="{row}">
          <span :style="{ fontWeight:'600', color: calcGross(row) >= 0 ? '#67C23A' : '#F56C6C' }">
            KSh {{ fmt(calcGross(row)) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="卸货费" align="right" width="110">
        <template slot-scope="{row}"><span style="color:#909399;">KSh {{ fmt(row.unloadingFee) }}</span></template>
      </el-table-column>
      <el-table-column label="配送费" align="right" width="110">
        <template slot-scope="{row}"><span style="color:#909399;">KSh {{ fmt(row.deliveryFee) }}</span></template>
      </el-table-column>
      <el-table-column label="员工工资" align="right" width="115">
        <template slot-scope="{row}"><span style="color:#909399;">KSh {{ fmt(row.salaryFee) }}</span></template>
      </el-table-column>
      <el-table-column label="销售提成" align="right" width="115">
        <template slot-scope="{row}"><span style="color:#909399;">KSh {{ fmt(row.commissionFee) }}</span></template>
      </el-table-column>
      <el-table-column label="仓储费" align="right" width="110">
        <template slot-scope="{row}"><span style="color:#909399;">KSh {{ fmt(row.storageFee) }}</span></template>
      </el-table-column>
      <el-table-column label="其他费用" align="right" width="115">
        <template slot-scope="{row}"><span style="color:#909399;">KSh {{ fmt(row.otherFee) }}</span></template>
      </el-table-column>

      <el-table-column label="净利润" align="right" width="130" fixed="right">
        <template slot-scope="{row}">
          <span :style="{ fontWeight:'700', color: calcNet(row) >= 0 ? '#67C23A' : '#F56C6C' }">
            KSh {{ fmt(calcNet(row)) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="净利润率" align="right" width="100" fixed="right">
        <template slot-scope="{row}">
          <span :style="{ color: calcNetMargin(row) >= 0 ? '#67C23A' : '#F56C6C' }">
            {{ calcNetMargin(row) }}%
          </span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 月度净利润趋势图 -->
    <div v-if="monthlyTrend.length > 1" style="margin-top:32px;">
      <div style="font-weight:600;margin-bottom:12px;font-size:14px;">月度净利润趋势</div>
      <div ref="trendChart" style="height:300px;"></div>
    </div>
  </el-card>
</template>

<script>
import * as echarts from 'echarts'
import { todayKe, monthsAgoKe } from '../../utils/time'
import { getGrossProfitReport } from '../../api/report'
import { getWarehouses } from '../../api/warehouse'
import { exportCSV } from '../../utils/export'

export default {
  data() {
    return {
      loading: false,
      tableData: [],
      warehouses: [],
      warehouseId: null,
      dateRange: [monthsAgoKe(1), todayKe()],
      trendChart: null
    }
  },
  computed: {
    monthlyTrend() {
      const map = {}
      this.tableData.forEach(r => {
        const month = (r.statDate || '').slice(0, 7)
        if (!month) return
        if (!map[month]) map[month] = 0
        map[month] += this.calcNet(r)
      })
      return Object.keys(map).sort().map(m => ({ month: m, netProfit: map[m] }))
    },
    totals() {
      const sum = key => this.tableData.reduce((s, r) => s + Number(r[key] || 0), 0)
      const revenue         = sum('revenue')
      const cogs            = sum('cogs')
      const replacementLoss = sum('replacementLoss')
      const damageLoss      = sum('damageLoss')
      const grossProfit     = revenue - cogs - replacementLoss - damageLoss
      const totalExpense    = sum('unloadingFee') + sum('deliveryFee') + sum('salaryFee') +
                              sum('commissionFee') + sum('storageFee') + sum('otherFee')
      const netProfit       = grossProfit - totalExpense
      const netMargin       = revenue > 0 ? (netProfit / revenue * 100).toFixed(2) : '0.00'
      return { revenue, cogs, replacementLoss, damageLoss, grossProfit, totalExpense, netProfit, netMargin }
    }
  },
  watch: {
    monthlyTrend() {
      this.$nextTick(() => this.drawTrendChart())
    }
  },
  created() {
    this.loadWarehouses()
    this.loadData()
  },
  methods: {
    drawTrendChart() {
      if (!this.$refs.trendChart) return
      if (!this.trendChart) {
        this.trendChart = echarts.init(this.$refs.trendChart)
      }
      const months = this.monthlyTrend.map(d => d.month)
      const values = this.monthlyTrend.map(d => Number(d.netProfit.toFixed(2)))
      this.trendChart.setOption({
        tooltip: { trigger: 'axis', formatter: p => `${p[0].name}<br/>净利润：KSh ${p[0].value.toLocaleString()}` },
        xAxis: { type: 'category', data: months, axisLabel: { rotate: 30 } },
        yAxis: { type: 'value', name: 'KSh', axisLabel: { formatter: v => v.toLocaleString() } },
        series: [{
          type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 8,
          itemStyle: { color: '#409EFF' },
          lineStyle: { width: 2 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(64,158,255,0.25)' }, { offset: 1, color: 'rgba(64,158,255,0.02)' }] } },
          markLine: { silent: true, data: [{ type: 'average', name: '均值' }] }
        }],
        grid: { left: '3%', right: '4%', bottom: '14%', containLabel: true }
      })
    },

    fmt(v) { return Number(v || 0).toFixed(2) },

    calcGross(row) {
      return Number(row.revenue || 0) - Number(row.cogs || 0)
             - Number(row.replacementLoss || 0) - Number(row.damageLoss || 0)
    },
    calcTotalExpense(row) {
      return Number(row.unloadingFee || 0) + Number(row.deliveryFee || 0)
           + Number(row.salaryFee || 0) + Number(row.commissionFee || 0)
           + Number(row.storageFee || 0) + Number(row.otherFee || 0)
    },
    calcNet(row) {
      return this.calcGross(row) - this.calcTotalExpense(row)
    },
    calcNetMargin(row) {
      const rev = Number(row.revenue || 0)
      if (rev === 0) return '0.00'
      return (this.calcNet(row) / rev * 100).toFixed(2)
    },

    async loadWarehouses() {
      const res = await getWarehouses().catch(() => ({ data: [] }))
      this.warehouses = (res.data || []).filter(w => w.status === 1)
    },
    async loadData() {
      if (!this.dateRange?.[0]) return
      this.loading = true
      try {
        const params = { startDate: this.dateRange[0], endDate: this.dateRange[1] }
        if (this.warehouseId) params.warehouseId = this.warehouseId
        const res = await getGrossProfitReport(params)
        this.tableData = res.data || []
      } finally {
        this.loading = false
      }
    },

    getSummary({ columns, data }) {
      const numCols = {
        '销售额': 'revenue', '销售成本': 'cogs', '退换货损失': 'replacementLoss',
        '损坏损失': 'damageLoss', '卸货费': 'unloadingFee', '配送费': 'deliveryFee',
        '员工工资': 'salaryFee', '销售提成': 'commissionFee', '仓储费': 'storageFee',
        '其他费用': 'otherFee'
      }
      return columns.map(col => {
        if (col.label === '日期') return '合计'
        const key = numCols[col.label]
        if (key) return 'KSh ' + data.reduce((s, r) => s + Number(r[key] || 0), 0).toFixed(2)
        if (col.label === '毛利润') return 'KSh ' + data.reduce((s, r) => s + this.calcGross(r), 0).toFixed(2)
        if (col.label === '净利润') return 'KSh ' + data.reduce((s, r) => s + this.calcNet(r), 0).toFixed(2)
        if (col.label === '净利润率') {
          const rev = data.reduce((s, r) => s + Number(r.revenue || 0), 0)
          const net = data.reduce((s, r) => s + this.calcNet(r), 0)
          return rev > 0 ? (net / rev * 100).toFixed(2) + '%' : '0.00%'
        }
        return ''
      })
    },

    handleExport() {
      exportCSV(
        ['日期', '销售额', '销售成本', '退换货损失', '损坏损失', '毛利润',
         '卸货费', '配送费', '员工工资', '销售提成', '仓储费', '其他费用', '净利润', '净利润率'],
        this.tableData.map(r => [
          r.statDate,
          this.fmt(r.revenue), this.fmt(r.cogs),
          this.fmt(r.replacementLoss), this.fmt(r.damageLoss),
          this.fmt(this.calcGross(r)),
          this.fmt(r.unloadingFee), this.fmt(r.deliveryFee),
          this.fmt(r.salaryFee), this.fmt(r.commissionFee),
          this.fmt(r.storageFee), this.fmt(r.otherFee),
          this.fmt(this.calcNet(r)), this.calcNetMargin(r) + '%'
        ]),
        `净利润报表_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      )
    }
  }
}
</script>