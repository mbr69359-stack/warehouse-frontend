<template>
  <el-card>
    <div slot="header">库存预警列表</div>
    <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;">
      <el-select v-model="query.warehouseId" placeholder="全部仓库" clearable style="width:160px;" @change="onFilter">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="onFilter">搜索</el-button>
      <el-button icon="el-icon-refresh" @click="reset">重置</el-button>
      <div style="margin-left:auto;">
        <el-button-group>
          <el-button :type="viewMode==='list'?'primary':''" icon="el-icon-menu" @click="viewMode='list'">列表</el-button>
          <el-button :type="viewMode==='chart'?'primary':''" icon="el-icon-data-analysis" @click="viewMode='chart'">图表</el-button>
        </el-button-group>
      </div>
    </div>

    <el-alert v-if="!loading && list.length === 0" title="当前没有库存预警" type="success" show-icon :closable="false" style="margin-bottom:16px;" />

    <!-- 图表视图 -->
    <div v-if="viewMode === 'chart'" v-loading="loading">
      <inventory-bar-chart v-if="alertChartData.length" :chart-data="alertChartData" title="库存预警商品" height="360px" />
      <el-empty v-else-if="!loading" description="当前没有库存预警" />
    </div>

    <!-- 列表视图 -->
    <el-table v-if="viewMode === 'list'" :data="list" v-loading="loading" border stripe>
      <el-table-column label="仓库" min-width="120">
        <template slot-scope="{row}">{{ warehouseMap[row.warehouseId] || row.warehouseId }}</template>
      </el-table-column>
      <el-table-column label="商品" min-width="160">
        <template slot-scope="{row}">{{ productMap[row.productId] || row.productId }}</template>
      </el-table-column>
      <el-table-column prop="qty" label="当前库存" width="110" align="center" />
      <el-table-column prop="alertQty" label="预警值" width="100" align="center" />
      <el-table-column label="缺口" width="90" align="center">
        <template slot-scope="{row}">
          <span style="color:#F56C6C;font-weight:bold;">{{ row.alertQty - row.qty }}</span>
        </template>
      </el-table-column>
      <el-table-column label="预警状态" width="110" align="center">
        <template slot-scope="{row}">
          <el-tag type="danger" size="small">库存不足</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" @click="goReplenish(row)">立即补货</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="viewMode === 'list'"
      style="margin-top:16px;text-align:right;"
      background
      layout="total, prev, pager, next, sizes"
      :total="total"
      :current-page="query.current"
      :page-size="query.size"
      :page-sizes="[10, 20, 50]"
      @current-change="p => { query.current = p; loadData() }"
      @size-change="s => { query.size = s; query.current = 1; loadData() }"
    />
  </el-card>
</template>

<script>
import { getAlerts } from '../../api/inventory'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import InventoryBarChart from '../../components/InventoryBarChart.vue'

export default {
  components: { InventoryBarChart },
  data() {
    return {
      list: [],
      total: 0,
      loading: false,
      warehouses: [],
      warehouseMap: {},
      productMap: {},
      query: { current: 1, size: 10, warehouseId: null },
      viewMode: 'list'
    }
  },
  computed: {
    alertChartData() {
      return this.list.map(row => ({
        productId: row.productId,
        productName: this.productMap[row.productId] || `商品#${row.productId}`,
        qty: row.qty,
        alertQty: row.alertQty,
        isLow: true
      }))
    }
  },
  created() {
    this.loadData()
    getWarehouses().then(r => {
      this.warehouses = r.data || []
      this.warehouseMap = Object.fromEntries(this.warehouses.map(w => [w.id, w.name]))
    })
    getProducts({ size: 1000 }).then(r => {
      const items = r.data.records || r.data || []
      this.productMap = Object.fromEntries(items.map(p => [p.id, p.name]))
    })
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const r = await getAlerts(this.query)
        const data = r.data
        if (data && data.records !== undefined) {
          this.list = data.records
          this.total = data.total
        } else {
          this.list = data || []
          this.total = this.list.length
        }
      } finally {
        this.loading = false
      }
    },
    onFilter() {
      this.query.current = 1
      this.loadData()
    },
    reset() {
      this.query = { current: 1, size: 10, warehouseId: null }
      this.loadData()
    },
    goReplenish(row) {
      this.$router.push({
        path: '/in-orders/create',
        query: { warehouseId: row.warehouseId, productId: row.productId }
      })
    }
  }
}
</script>
