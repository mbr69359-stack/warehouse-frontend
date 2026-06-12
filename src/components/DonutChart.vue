<template>
  <div ref="chartDom" style="width:100%;height:280px;" />
</template>

<script>
import * as echarts from 'echarts'
import { formatBoxQty } from '../utils/unit'
const PALETTE = ['#5470c6','#91cc75','#fac858','#ee6666','#73c0de','#3ba272','#fc8452','#9a60b4']
export default {
  name: 'DonutChart',
  props: {
    chartData: { type: Array, default: () => [] },
    unit: { type: String, default: 'piece' }
  },
  data() { return { chart: null } },
  watch: {
    chartData() { this.render() },
    unit() { this.render() }
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chartDom)
    this.render()
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    if (this.chart) this.chart.dispose()
  },
  methods: {
    onResize() { this.chart && this.chart.resize() },
    render() {
      if (!this.chart || !this.chartData.length) return
      const isBox = this.unit === 'box'
      const sorted = [...this.chartData].sort((a, b) => (b.qty || 0) - (a.qty || 0))
      const top  = sorted.slice(0, 7)
      const rest = sorted.slice(7)
      const series = top.map(d => {
        const f = isBox ? formatBoxQty(d.qty || 0, d.qtyPerBox) : { value: d.qty || 0, text: `${d.qty || 0}个` }
        return { name: d.productName, value: f.value, text: f.text }
      })
      if (rest.length) {
        const restValue = rest.reduce((s, d) => {
          const f = isBox ? formatBoxQty(d.qty || 0, d.qtyPerBox) : { value: d.qty || 0 }
          return s + f.value
        }, 0)
        series.push({
          name: '其他',
          value: Number(restValue.toFixed(1)),
          text: isBox ? `约${restValue.toFixed(1)}箱` : `${restValue}个`
        })
      }
      this.chart.setOption({
        tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.data.text} (${p.percent}%)` },
        legend: {
          orient: 'vertical', right: '4%', top: 'center',
          formatter: n => n.length > 7 ? n.slice(0, 7) + '…' : n,
          textStyle: { fontSize: 12 }
        },
        series: [{
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['38%', '50%'],
          data: series.map((d, i) => ({ ...d, itemStyle: { color: PALETTE[i % PALETTE.length] } })),
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
          animationType: 'scale',
          animationEasing: 'elasticOut'
        }]
      }, true)
    }
  }
}
</script>