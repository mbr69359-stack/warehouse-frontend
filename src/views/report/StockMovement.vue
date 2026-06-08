<template>
  <div>
    <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
      <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">swap_vert</span>
      <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">库存进出报表</p>
      <p style="font-size:13px;color:#757684;">请在电脑端查看</p>
    </div>
    <el-card v-else>
      <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:600;">库存进出报表</span>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
          @change="loadData" style="width:240px;" />
        <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
        <span style="color:#999;font-size:12px;">共 {{ tableData.length }} 个商品</span>
      </div>

      <div ref="chart" style="height:300px;margin-bottom:16px;"></div>

      <el-table :data="tableData" border stripe size="small" show-summary :summary-method="getSummary">
        <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="skuCode" label="SKU" width="120" />
        <el-table-column prop="categoryName" label="分类" width="90" />
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column label="入库数量" width="90" align="right">
          <template slot-scope="{row}"><span style="color:#67C23A;">{{ row.inQty }}</span></template>
        </el-table-column>
        <el-table-column label="入库金额" width="110" align="right">
          <template slot-scope="{row}"><span style="color:#67C23A;">KSh {{ fmt(row.inAmount) }}</span></template>
        </el-table-column>
        <el-table-column label="出库数量" width="90" align="right">
          <template slot-scope="{row}"><span style="color:#F56C6C;">{{ row.outQty }}</span></template>
        </el-table-column>
        <el-table-column label="出库金额" width="110" align="right">
          <template slot-scope="{row}"><span style="color:#F56C6C;">KSh {{ fmt(row.outAmount) }}</span></template>
        </el-table-column>
        <el-table-column label="净变动" width="90" align="right">
          <template slot-scope="{row}">
            <span :style="{ color: (row.inQty - row.outQty) >= 0 ? '#67C23A' : '#F56C6C', fontWeight: 600 }">
              {{ row.inQty - row.outQty >= 0 ? '+' : '' }}{{ row.inQty - row.outQty }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { getStockMovementReport } from '../../api/report'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'

export default {
  mixins: [mobileMixin],
  data() {
    const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - 1)
    return {
      tableData: [], chart: null,
      dateRange: [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    }
  },
  mounted() {
    if (!this.isMobile) {
      this.chart = echarts.init(this.$refs.chart)
      this.loadData()
    }
  },
  beforeDestroy() { this.chart && this.chart.dispose() },
  methods: {
    fmt(v) { return Number(v || 0).toFixed(2) },
    async loadData() {
      if (!this.dateRange || !this.dateRange[0]) return
      const res = await getStockMovementReport({ startDate: this.dateRange[0], endDate: this.dateRange[1] })
      this.tableData = res.data || []
      this.renderChart()
    },
    renderChart() {
      const top10 = this.tableData.slice(0, 10)
      this.chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['入库金额', '出库金额'] },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: top10.map(d => d.productName), axisLabel: { interval: 0, rotate: 20 } },
        yAxis: { type: 'value', name: '金额(KSh )' },
        series: [
          { name: '入库金额', type: 'bar', data: top10.map(d => Number(d.inAmount || 0).toFixed(2)), itemStyle: { color: '#67C23A', barBorderRadius: [4, 4, 0, 0] } },
          { name: '出库金额', type: 'bar', data: top10.map(d => Number(d.outAmount || 0).toFixed(2)), itemStyle: { color: '#F56C6C', barBorderRadius: [4, 4, 0, 0] } }
        ]
      })
    },
    getSummary({ columns, data }) {
      return columns.map((col, i) => {
        if (i === 0) return '合计'
        const keys = { 4: 'inQty', 5: 'inAmount', 6: 'outQty', 7: 'outAmount' }
        if (!keys[i]) return ''
        const sum = data.reduce((s, r) => s + Number(r[keys[i]] || 0), 0)
        return keys[i].includes('Amount') ? 'KSh ' + sum.toFixed(2) : sum
      })
    },
    handleExport() {
      exportCSV(
        ['商品名称', 'SKU', '分类', '单位', '入库数量', '入库金额', '出库数量', '出库金额', '净变动'],
        this.tableData.map(r => [
          r.productName, r.skuCode, r.categoryName, r.unit,
          r.inQty, this.fmt(r.inAmount), r.outQty, this.fmt(r.outAmount), r.inQty - r.outQty
        ]),
        `库存进出报表_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      )
    }
  }
}
</script>
