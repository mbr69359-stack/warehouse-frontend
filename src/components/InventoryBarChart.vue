<template>
  <div>
    <div v-if="showWarehouseSelect" style="margin-bottom:12px">
      <el-select v-model="selectedWarehouseId" placeholder="选择仓库" size="small" @change="onWarehouseChange">
        <el-option label="全部仓库" :value="null" />
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
    </div>
    <div v-show="true" ref="chartDom" :style="{ width: '100%', height: height }" />
  </div>
</template>

<script>
import * as echarts from 'echarts'

const PALETTE = ['#dde3ff', '#c8f5ec', '#ffe0d6', '#f0d9f8', '#ffe8c2', '#b3e9ff']
const LOW_COLOR = '#ffd6d6'
const LABEL_COLOR = '#2a2d4a'

export default {
  name: 'InventoryBarChart',
  props: {
    chartData: { type: Array, default: () => [] },
    title: { type: String, default: '' },
    warehouses: { type: Array, default: () => [] },
    showWarehouseSelect: { type: Boolean, default: false },
    height: { type: String, default: '320px' },
    horizontal: { type: Boolean, default: false }
  },
  emits: ['warehouse-change'],
  data() {
    return { selectedWarehouseId: null, chart: null }
  },
  watch: {
    chartData() { this.renderChart() }
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chartDom)
    this.renderChart()
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    if (this.chart) this.chart.dispose()
  },
  methods: {
    onResize() { this.chart && this.chart.resize() },
    onWarehouseChange(val) { this.$emit('warehouse-change', val) },
    renderChart() {
      if (!this.chart || !this.chartData.length) return
      const data = this.chartData
      const maxQty = Math.max(...data.map(d => d.qty || 0))
      const names = data.map(d => d.isLow ? `⚠ ${d.productName}` : d.productName)
      const values = data.map((d, i) => ({
        value: d.qty,
        itemStyle: {
          color: d.isLow ? LOW_COLOR : PALETTE[i % PALETTE.length],
          barBorderRadius: this.horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]
        },
        label: {
          position: this.horizontal
            ? (maxQty > 0 && d.qty / maxQty < 0.1 ? 'right' : 'inside')
            : (maxQty > 0 && d.qty / maxQty < 0.1 ? 'top' : 'inside'),
          color: LABEL_COLOR
        }
      }))

      const option = this.horizontal ? {
        title: this.title ? { text: this.title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '2%', right: '8%', top: '4%', bottom: '4%', containLabel: true },
        xAxis: { type: 'value', name: '数量' },
        yAxis: {
          type: 'category',
          data: names,
          axisLabel: {
            interval: 0,
            fontSize: 12,
            color: v => v.startsWith('⚠') ? '#f56c6c' : '#2a2d4a',
            formatter: v => v.length > 10 ? v.slice(0, 10) + '…' : v
          }
        },
        series: [{
          type: 'bar',
          data: values,
          label: { show: true, formatter: p => p.value, fontWeight: 700 },
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: 700
        }]
      } : {
        title: this.title ? { text: this.title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: names,
          axisLabel: {
            interval: 0,
            rotate: data.length > 6 ? 30 : 0,
            rich: { low: { color: '#f56c6c', fontWeight: 'bold' } },
            formatter: v => v
          }
        },
        yAxis: { type: 'value', name: '数量' },
        series: [{
          type: 'bar',
          data: values,
          label: { show: true, formatter: p => p.value, fontWeight: 700 },
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: 700
        }]
      }
      this.chart.setOption(option, true)
    }
  }
}
</script>