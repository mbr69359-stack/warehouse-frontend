<template>
  <el-card>
    <div slot="header" style="display:flex;gap:12px;align-items:center;">
      <span>出库报表</span>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
        @change="loadData" style="width:260px;" />
    </div>
    <div ref="chart" style="height:360px;"></div>
    <el-table :data="tableData" border stripe style="margin-top:20px;">
      <el-table-column prop="date" label="日期" width="130" />
      <el-table-column prop="count" label="出库单数" width="110" />
      <el-table-column label="出库金额"><template slot-scope="{row}">¥{{ Number(row.amount||0).toFixed(2) }}</template></el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import * as echarts from 'echarts'
import { getOutReport } from '../../api/report'
export default {
  data() {
    const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6)
    return { chart: null, tableData: [], dateRange: [start.toISOString().slice(0,10), end.toISOString().slice(0,10)] }
  },
  mounted() { this.chart = echarts.init(this.$refs.chart); this.loadData() },
  beforeDestroy() { this.chart && this.chart.dispose() },
  methods: {
    async loadData() {
      if (!this.dateRange || !this.dateRange[0]) return
      const res = await getOutReport({ startDate: this.dateRange[0], endDate: this.dateRange[1] })
      this.tableData = res.data || []
      this.chart.setOption({
        tooltip: { trigger: 'axis' }, legend: { data: ['出库单数', '出库金额'] },
        xAxis: { type: 'category', data: this.tableData.map(d => d.date) },
        yAxis: [{ type: 'value', name: '单数' }, { type: 'value', name: '金额(¥)' }],
        series: [
          { name: '出库单数', type: 'bar', data: this.tableData.map(d => d.count), itemStyle: { color: '#E6A23C' } },
          { name: '出库金额', type: 'line', yAxisIndex: 1, data: this.tableData.map(d => Number(d.amount||0).toFixed(2)), itemStyle: { color: '#F56C6C' } }
        ]
      })
    }
  }
}
</script>
