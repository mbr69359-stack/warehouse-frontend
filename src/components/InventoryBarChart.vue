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
import { formatBoxQty } from '../utils/unit'

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
    horizontal: { type: Boolean, default: false },
    unit: { type: String, default: 'piece' }
  },
  emits: ['warehouse-change'],
  data() {
    return { selectedWarehouseId: null, chart: null }
  },
  watch: {
    chartData() { this.renderChart() },
    unit() { this.renderChart() }
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
      const isBox = this.unit === 'box'
      const data = this.chartData.map(d => {
        const f = isBox ? formatBoxQty(d.qty || 0, d.qtyPerBox) : { value: d.qty || 0, text: String(d.qty || 0) }
        return { ...d, value: f.value, text: f.text }
      })
      const maxQty = Math.max(...data.map(d => d.value || 0))
      const names = data.map(d => d.isLow ? `⚠ ${d.productName}` : d.productName)
      const values = data.map((d, i) => ({
        value: d.value,
        itemStyle: {
          color: d.isLow ? LOW_COLOR : PALETTE[i % PALETTE.length],
          barBorderRadius: this.horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]
        },
        label: {
          position: this.horizontal
            ? (maxQty > 0 && d.value / maxQty < 0.1 ? 'right' : 'inside')
            : (maxQty > 0 && d.value / maxQty < 0.1 ? 'top' : 'inside'),
          color: LABEL_COLOR
        }
      }))
      const labelFmt = p => data[p.dataIndex].text
      const tooltipFmt = ps => ps.map(p => `${p.marker}${p.name}: ${data[p.dataIndex].text}`).join('<br/>')

      const option = this.horizontal ? {
        title: this.title ? { text: this.title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipFmt },
        grid: { left: '2%', right: '8%', top: '4%', bottom: '4%', containLabel: true },
        xAxis: { type: 'value', name: isBox ? '数量(箱)' : '数量' },
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
          label: { show: true, formatter: labelFmt, fontWeight: 700 },
          animationType: 'scale',
          animationEasing: 'cubicOut',
          animationDuration: 500,
          animationDelay: idx => idx * 60
        }]
      } : {
        title: this.title ? { text: this.title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipFmt },
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
        yAxis: { type: 'value', name: isBox ? '数量(箱)' : '数量' },
        series: [{
          type: 'bar',
          data: values,
          label: { show: true, formatter: labelFmt, fontWeight: 700 },
          animationType: 'scale',
          animationEasing: 'cubicOut',
          animationDuration: 500,
          animationDelay: idx => idx * 60
        }]
      }
      this.chart.setOption(option, true)
    }
  }
}
</script>