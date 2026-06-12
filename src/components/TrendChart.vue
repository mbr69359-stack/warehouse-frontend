<template>
  <div ref="chartDom" style="width:100%;height:280px;" />
</template>

<script>
import * as echarts from 'echarts'
export default {
  name: 'TrendChart',
  props: {
    inData:  { type: Array, default: () => [] },
    outData: { type: Array, default: () => [] },
    unit:    { type: String, default: 'piece' }
  },
  data() { return { chart: null } },
  watch: {
    inData()  { this.render() },
    outData() { this.render() },
    unit()    { this.render() }
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
      if (!this.chart) return
      const dateSet = new Set([...this.inData.map(d => d.date), ...this.outData.map(d => d.date)])
      const dates = [...dateSet].sort()
      const isBox = this.unit === 'box'
      const field = isBox ? 'totalBoxes' : 'totalQty'
      const unitLabel = isBox ? '箱' : '个'
      const inName  = `入库量(${unitLabel})`
      const outName = `出库量(${unitLabel})`
      const inMap  = Object.fromEntries(this.inData.map(d => [d.date, Number(d[field]) || 0]))
      const outMap = Object.fromEntries(this.outData.map(d => [d.date, Number(d[field]) || 0]))
      this.chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: [inName, outName], bottom: 0 },
        grid: { left: '3%', right: '4%', top: '8%', bottom: '18%', containLabel: true },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: { formatter: v => v.slice(5), rotate: dates.length > 15 ? 30 : 0 }
        },
        yAxis: isBox ? { type: 'value' } : { type: 'value', minInterval: 1 },
        series: [
          {
            name: inName, type: 'line', smooth: true,
            data: dates.map(d => inMap[d] || 0),
            itemStyle: { color: '#409EFF' },
            areaStyle: { color: 'rgba(64,158,255,.08)' }
          },
          {
            name: outName, type: 'line', smooth: true,
            data: dates.map(d => outMap[d] || 0),
            itemStyle: { color: '#67C23A' },
            areaStyle: { color: 'rgba(103,194,58,.08)' }
          }
        ]
      }, true)
    }
  }
}
</script>