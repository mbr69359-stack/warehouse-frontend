<template>
  <div>
    <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
      <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">inventory_2</span>
      <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">库存盘点表</p>
      <p style="font-size:13px;color:#757684;">请在电脑端查看</p>
    </div>
    <el-card v-else class="stocktake-card">
      <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:600;">库存盘点表</span>
        <el-select v-model="filterWarehouse" placeholder="全部仓库" clearable style="width:160px;" @change="loadData">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-input v-model="searchKeyword" placeholder="搜索商品名/SKU" clearable style="width:180px;" prefix-icon="el-icon-search" />
        <el-checkbox v-model="onlyAlert">仅显示预警</el-checkbox>
        <el-button icon="el-icon-printer" @click="handlePrint">打印</el-button>
        <el-button icon="el-icon-download" @click="handleExport" :disabled="!filteredData.length">导出 Excel</el-button>
        <span style="color:#999;font-size:12px;">
          共 {{ filteredData.length }} 个商品，其中
          <span style="color:#F56C6C;font-weight:600;">{{ alertCount }}</span> 个预警
        </span>
      </div>

      <el-table :data="filteredData" border stripe size="small" row-class-name="stocktake-row"
        :row-style="rowStyle" show-summary :summary-method="getSummary">
        <el-table-column prop="warehouseName" label="仓库" width="100" />
        <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="skuCode" label="SKU编号" width="120" />
        <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="categoryName" label="分类" width="90" />
        <el-table-column label="当前库存" width="100" align="right">
          <template slot-scope="{row}">
            <span :style="{ color: row.isAlert ? '#F56C6C' : '#303133', fontWeight: row.isAlert ? 600 : 400 }">
              {{ row.currentQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="alertQty" label="预警值" width="80" align="right" />
        <el-table-column label="状态" width="80" align="center">
          <template slot-scope="{row}">
            <el-tag v-if="row.isAlert" type="danger" size="mini">预警</el-tag>
            <el-tag v-else type="success" size="mini">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="盘点数量" width="100" align="center" class-name="no-print">
          <template slot-scope="{row}">
            <el-input-number v-model="row.checkQty" :min="0" size="mini" style="width:80px;" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="差异" width="80" align="right" class-name="no-print">
          <template slot-scope="{row}">
            <span v-if="row.checkQty !== undefined && row.checkQty !== null"
              :style="{ color: row.checkQty - row.currentQty !== 0 ? '#F56C6C' : '#67C23A', fontWeight: 600 }">
              {{ row.checkQty - row.currentQty >= 0 ? '+' : '' }}{{ row.checkQty - row.currentQty }}
            </span>
            <span v-else style="color:#ccc;">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { getStocktakeReport } from '../../api/report'
import { getWarehouses } from '../../api/warehouse'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'

export default {
  mixins: [mobileMixin],
  data() {
    return {
      tableData: [], warehouses: [],
      filterWarehouse: null, searchKeyword: '', onlyAlert: false
    }
  },
  computed: {
    filteredData() {
      let list = this.tableData
      if (this.onlyAlert) list = list.filter(r => r.isAlert)
      if (this.searchKeyword) {
        const kw = this.searchKeyword.toLowerCase()
        list = list.filter(r => r.productName.toLowerCase().includes(kw) || (r.skuCode || '').toLowerCase().includes(kw))
      }
      return list
    },
    alertCount() { return this.filteredData.filter(r => r.isAlert).length }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data || [] })
    this.loadData()
  },
  methods: {
    async loadData() {
      const params = {}
      if (this.filterWarehouse) params.warehouseId = this.filterWarehouse
      const res = await getStocktakeReport(params)
      this.tableData = (res.data || []).map(r => ({ ...r, checkQty: null }))
    },
    rowStyle({ row }) {
      return row.isAlert ? { background: '#fff5f5' } : {}
    },
    getSummary({ columns, data }) {
      return columns.map((col, i) => {
        if (i === 0) return '合计'
        if (i === 6) return data.reduce((s, r) => s + Number(r.currentQty || 0), 0)
        return ''
      })
    },
    handlePrint() { window.print() },
    handleExport() {
      exportCSV(
        ['仓库', '商品名称', 'SKU编号', '规格', '单位', '分类', '当前库存', '预警值', '状态'],
        this.filteredData.map(r => [
          r.warehouseName, r.productName, r.skuCode, r.spec || '', r.unit,
          r.categoryName, r.currentQty, r.alertQty, r.isAlert ? '预警' : '正常'
        ]),
        `库存盘点表_${new Date().toISOString().slice(0, 10)}.csv`
      )
    }
  }
}
</script>

<style>
@media print {
  .el-aside, .el-header, .el-card__header { display: none !important; }
  .no-print { display: none !important; }
  .stocktake-card { box-shadow: none; }
}
</style>
