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
        <el-radio-group v-model="displayMode" size="small">
          <el-radio-button label="piece">按个</el-radio-button>
          <el-radio-button label="box">按箱</el-radio-button>
        </el-radio-group>
        <span style="color:#999;font-size:12px;">共 {{ tableData.length }} 个商品</span>
      </div>

      <div ref="chart" style="height:300px;margin-bottom:16px;"></div>

      <el-table :data="tableData" border stripe size="small" show-summary :summary-method="getSummary">
        <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="skuCode" label="SKU" width="120" />
        <el-table-column prop="categoryName" label="分类" width="90" />
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column label="入库数量" width="100" align="right">
          <template slot-scope="{row}"><span style="color:#67C23A;">{{ fmtQty(row.inQty, row.qtyPerBox) }}</span></template>
        </el-table-column>
        <el-table-column label="入库金额" width="110" align="right">
          <template slot-scope="{row}"><span style="color:#67C23A;">KSh {{ fmt(row.inAmount) }}</span></template>
        </el-table-column>
        <el-table-column label="出库数量" width="100" align="right">
          <template slot-scope="{row}"><span style="color:#F56C6C;">{{ fmtQty(row.outQty, row.qtyPerBox) }}</span></template>
        </el-table-column>
        <el-table-column label="出库金额" width="110" align="right">
          <template slot-scope="{row}"><span style="color:#F56C6C;">KSh {{ fmt(row.outAmount) }}</span></template>
        </el-table-column>
        <el-table-column label="净变动" width="100" align="right">
          <template slot-scope="{row}">
            <span :style="{ color: (row.inQty - row.outQty) >= 0 ? '#67C23A' : '#F56C6C', fontWeight: 600 }">
              {{ fmtQty(row.inQty - row.outQty, row.qtyPerBox, true) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { todayKe, monthsAgoKe } from '../../utils/time'
import { getStockMovementReport } from '../../api/report'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'

export default {
  mixins: [mobileMixin],
  data() {
    return {
      tableData: [], chart: null,
      dateRange: [monthsAgoKe(1), todayKe()],
      displayMode: 'piece'
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
    fmtQty(qty, qtyPerBox, signed) {
      qty = Number(qty || 0)
      if (this.displayMode === 'box' && qtyPerBox > 0) {
        const abs = Math.abs(qty)
        const sign = qty < 0 ? '-' : (signed && qty > 0 ? '+' : '')
        const boxes = Math.floor(abs / qtyPerBox)
        const rem = abs % qtyPerBox
        const str = boxes > 0 ? (rem > 0 ? `${boxes}箱${rem}个` : `${boxes}箱`) : `${rem}个`
        return sign + str
      }
      const prefix = signed ? (qty >= 0 ? '+' : '') : ''
      return prefix + qty + '个'
    },
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
      const fmtSum = (key) => {
        const totalPieces = data.reduce((s, r) => s + Number(r[key] || 0), 0)
        if (this.displayMode === 'box') {
          const totalBoxes = data.reduce((s, r) => {
            const qpb = r.qtyPerBox
            return s + (qpb > 0 ? Math.floor(Number(r[key] || 0) / qpb) : Number(r[key] || 0))
          }, 0)
          const remPieces = data.reduce((s, r) => {
            const qpb = r.qtyPerBox
            return s + (qpb > 0 ? Number(r[key] || 0) % qpb : 0)
          }, 0)
          return remPieces > 0 ? `${totalBoxes}箱${remPieces}个` : `${totalBoxes}箱`
        }
        return totalPieces + '个'
      }
      return columns.map((col, i) => {
        if (i === 0) return '合计'
        if (i === 4) return fmtSum('inQty')
        if (i === 5) return 'KSh ' + data.reduce((s, r) => s + Number(r.inAmount || 0), 0).toFixed(2)
        if (i === 6) return fmtSum('outQty')
        if (i === 7) return 'KSh ' + data.reduce((s, r) => s + Number(r.outAmount || 0), 0).toFixed(2)
        return ''
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
