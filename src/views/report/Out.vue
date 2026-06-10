<template>
  <div>
  <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
    <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">bar_chart</span>
    <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">出库报表</p>
    <p style="font-size:13px;color:#757684;">功能建设中，请在电脑端查看</p>
  </div>
  <el-card v-else>
    <div slot="header" style="display:flex;gap:12px;align-items:center;">
      <span>出库报表</span>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
        @change="loadData" style="width:260px;" />
      <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
    </div>
    <div ref="chart" style="height:360px;"></div>
    <el-table :data="tableData" border stripe style="margin-top:20px;">
      <el-table-column prop="date" label="日期" width="130" />
      <el-table-column prop="count" label="出库单数" width="110" />
      <el-table-column label="出库金额"><template slot-scope="{row}">KSh {{ Number(row.amount||0).toFixed(2) }}</template></el-table-column>
      <el-table-column label="总件数" width="100" align="right">
        <template slot-scope="{row}">{{ Number(row.totalQty||0) }}个</template>
      </el-table-column>
      <el-table-column label="总箱数" width="100" align="right">
        <template slot-scope="{row}">{{ Number(row.totalBoxes||0) }}箱</template>
      </el-table-column>
    </el-table>
  </el-card>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { todayKe, daysAgoKe } from '../../utils/time'
import { getOutReport } from '../../api/report'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'
export default {
  mixins: [mobileMixin],
  data() {
    return { chart: null, tableData: [], dateRange: [daysAgoKe(6), todayKe()] }
  },
  mounted() { if (!this.isMobile) { this.chart = echarts.init(this.$refs.chart); this.loadData() } },
  beforeDestroy() { this.chart && this.chart.dispose() },
  methods: {
    handleExport() {
      const filename = `出库报表_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      exportCSV(
        ['日期', '出库单数', '出库金额(KSh)', '总件数(个)', '总箱数(箱)'],
        this.tableData.map(r => [r.date, r.count, Number(r.amount || 0).toFixed(2), r.totalQty || 0, r.totalBoxes || 0]),
        filename
      )
    },
    async loadData() {
      if (!this.dateRange || !this.dateRange[0]) return
      const res = await getOutReport({ startDate: this.dateRange[0], endDate: this.dateRange[1] })
      this.tableData = res.data || []
      this.chart.setOption({
        tooltip: { trigger: 'axis' }, legend: { data: ['出库单数', '出库金额'] },
        xAxis: { type: 'category', data: this.tableData.map(d => d.date) },
        yAxis: [{ type: 'value', name: '单数' }, { type: 'value', name: '金额(KSh )' }],
        series: [
          { name: '出库单数', type: 'bar', data: this.tableData.map(d => d.count), itemStyle: { color: '#E6A23C', barBorderRadius: [4, 4, 0, 0] }, animationType: 'scale', animationEasing: 'elasticOut', animationDuration: 800, animationDelay: idx => idx * 60 },
          { name: '出库金额', type: 'line', yAxisIndex: 1, data: this.tableData.map(d => Number(d.amount||0).toFixed(2)), itemStyle: { color: '#F56C6C' } }
        ]
      })
    }
  }
}
</script>