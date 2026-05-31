<template>
  <div>
  <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
    <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">inventory_2</span>
    <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">库存报表</p>
    <p style="font-size:13px;color:#757684;">功能建设中，请在电脑端查看</p>
  </div>
  <div v-else>
    <el-row :gutter="20" style="margin-bottom:20px;">
      <el-col :span="8"><el-card shadow="hover" style="text-align:center;">
        <div style="font-size:36px;font-weight:bold;color:#409EFF;">{{ summary.totalSkus||0 }}</div>
        <div style="color:#909399;margin-top:8px;">商品种类（SKU）</div>
      </el-card></el-col>
      <el-col :span="8"><el-card shadow="hover" style="text-align:center;">
        <div style="font-size:36px;font-weight:bold;color:#67C23A;">{{ summary.totalQty||0 }}</div>
        <div style="color:#909399;margin-top:8px;">总库存数量</div>
      </el-card></el-col>
      <el-col :span="8"><el-card shadow="hover" style="text-align:center;">
        <div style="font-size:36px;font-weight:bold;color:#F56C6C;">{{ summary.alertCount||0 }}</div>
        <div style="color:#909399;margin-top:8px;">库存预警数</div>
      </el-card></el-col>
    </el-row>
    <el-card>
      <div slot="header" style="display:flex;gap:12px;align-items:center;">
        <span>库存明细</span>
        <el-select v-model="warehouseId" placeholder="全部仓库" clearable style="width:160px;" @change="loadData">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </div>
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column label="仓库" min-width="120">
          <template slot-scope="{row}">{{ warehouseMap[row.warehouseId] || row.warehouseId }}</template>
        </el-table-column>
        <el-table-column label="商品" min-width="160">
          <template slot-scope="{row}">{{ productMap[row.productId] || row.productId }}</template>
        </el-table-column>
        <el-table-column prop="qty" label="当前库存" width="110" align="center" />
        <el-table-column prop="alertQty" label="预警值" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template slot-scope="{row}">
            <el-tag v-if="row.alertQty > 0 && row.qty < row.alertQty" type="danger">预警</el-tag>
            <el-tag v-else type="success">正常</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
  </div>
</template>

<script>
import { getInventory } from '../../api/inventory'
import { getInventorySummary } from '../../api/report'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import mobileMixin from '../../mixins/mobile'
export default {
  mixins: [mobileMixin],
  data() {
    return {
      summary: {}, list: [], loading: false,
      warehouses: [], warehouseId: null,
      warehouseMap: {}, productMap: {}
    }
  },
  created() {
    getWarehouses().then(r => {
      this.warehouses = r.data || []
      this.warehouseMap = Object.fromEntries(this.warehouses.map(w => [w.id, w.name]))
    })
    getProducts({ size: 1000 }).then(r => {
      const items = r.data.records || r.data || []
      this.productMap = Object.fromEntries(items.map(p => [p.id, p.name]))
    })
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      const [sumRes, invRes] = await Promise.all([
        getInventorySummary({ warehouseId: this.warehouseId }),
        getInventory({ current: 1, size: 200, warehouseId: this.warehouseId })
      ]).finally(() => { this.loading = false })
      this.summary = sumRes.data || {}
      this.list = invRes.data.records || []
    }
  }
}
</script>
