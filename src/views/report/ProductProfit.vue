<template>
  <el-card>
    <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <span style="font-weight:600;">商品毛利分析</span>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
        @change="loadData" style="width:240px;" />
      <el-select v-model="warehouseId" placeholder="全部仓库" clearable style="width:130px;" @change="loadData">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
      <el-button icon="el-icon-download" @click="exportCsv" :disabled="!tableData.length">导出 CSV</el-button>
    </div>

    <!-- 汇总卡片 -->
    <el-row :gutter="12" style="margin-bottom:20px;">
      <el-col :span="8">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">总销售额</div>
          <div style="font-size:20px;font-weight:700;color:#409EFF;margin-top:4px;">KSh {{ fmt(totals.revenue) }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">总毛利润</div>
          <div :style="{ fontSize:'20px', fontWeight:'700', marginTop:'4px', color: totals.grossProfit >= 0 ? '#67C23A' : '#F56C6C' }">
            KSh {{ fmt(totals.grossProfit) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" style="text-align:center;">
          <div style="font-size:13px;color:#909399;">平均毛利率</div>
          <div :style="{ fontSize:'20px', fontWeight:'700', marginTop:'4px', color: totals.grossMargin >= 0 ? '#67C23A' : '#F56C6C' }">
            {{ fmtPct(totals.grossMargin) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="tableData" border stripe v-loading="loading" style="width:100%;"
      :default-sort="{ prop: 'grossProfit', order: 'descending' }">
      <el-table-column type="index" label="#" width="50" align="center" />
      <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="skuCode" label="SKU" width="120" show-overflow-tooltip />
      <el-table-column label="销售额" align="right" width="140" sortable prop="revenue">
        <template slot-scope="{row}"><span style="color:#409EFF;">KSh {{ fmt(row.revenue) }}</span></template>
      </el-table-column>
      <el-table-column label="销售成本" align="right" width="130" sortable prop="cogs">
        <template slot-scope="{row}">KSh {{ fmt(row.cogs) }}</template>
      </el-table-column>
      <el-table-column label="毛利润" align="right" width="140" sortable prop="grossProfit">
        <template slot-scope="{row}">
          <span :style="{ fontWeight:'600', color: Number(row.grossProfit) >= 0 ? '#67C23A' : '#F56C6C' }">
            KSh {{ fmt(row.grossProfit) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="毛利率" align="right" width="110" sortable prop="grossMargin">
        <template slot-scope="{row}">
          <span :style="{ color: Number(row.grossMargin) >= 0 ? '#67C23A' : '#F56C6C' }">
            {{ fmtPct(row.grossMargin) }}
          </span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import { getProductProfitReport } from '../../api/report'
import { getWarehouses } from '../../api/warehouse'

export default {
  data() {
    const end = new Date()
    const start = new Date(); start.setDate(1)
    const fmt = d => d.toISOString().slice(0, 10)
    return {
      loading: false,
      dateRange: [fmt(start), fmt(end)],
      warehouseId: null,
      warehouses: [],
      tableData: []
    }
  },
  computed: {
    totals() {
      const revenue = this.tableData.reduce((s, r) => s + Number(r.revenue || 0), 0)
      const grossProfit = this.tableData.reduce((s, r) => s + Number(r.grossProfit || 0), 0)
      const grossMargin = revenue > 0 ? grossProfit / revenue : 0
      return { revenue, grossProfit, grossMargin }
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    this.loadData()
  },
  methods: {
    loadData() {
      if (!this.dateRange) return
      this.loading = true
      getProductProfitReport({
        startDate: this.dateRange[0],
        endDate: this.dateRange[1],
        warehouseId: this.warehouseId || undefined
      })
        .then(r => { this.tableData = r.data })
        .finally(() => { this.loading = false })
    },
    fmt(v) {
      const n = Number(v || 0)
      return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    fmtPct(v) {
      return (Number(v || 0) * 100).toFixed(1) + '%'
    },
    exportCsv() {
      const headers = ['商品名称', 'SKU', '销售额', '销售成本', '毛利润', '毛利率']
      const rows = this.tableData.map(r => [
        r.productName, r.skuCode,
        Number(r.revenue).toFixed(2),
        Number(r.cogs).toFixed(2),
        Number(r.grossProfit).toFixed(2),
        this.fmtPct(r.grossMargin)
      ])
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `商品毛利分析_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      a.click(); URL.revokeObjectURL(url)
    }
  }
}
</script>