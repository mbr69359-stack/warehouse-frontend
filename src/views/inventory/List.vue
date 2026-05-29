<template>
  <el-card>
    <div style="margin-bottom:16px;display:flex;gap:12px;">
      <el-select v-model="query.warehouseId" placeholder="全部仓库" clearable style="width:150px;" @change="onFilter">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="onFilter">搜索</el-button>
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
          <el-tag v-if="row.alertQty > 0 && row.qty < row.alertQty" type="danger">库存不足</el-tag>
          <el-tag v-else type="success">正常</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updateTime" label="更新时间" min-width="160" />
      <el-table-column label="操作" width="120" align="center">
        <template slot-scope="{row}"><el-button size="mini" @click="setAlert(row)">设置预警值</el-button></template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
      :total="total" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />
    <el-dialog title="设置预警值" :visible.sync="alertDialog" width="360px">
      <el-form label-width="90px">
        <el-form-item label="商品">
          <el-input :value="productMap[alertForm.productId] || alertForm.productId" disabled />
        </el-form-item>
        <el-form-item label="预警库存">
          <el-input-number v-model="alertForm.alertQty" :min="0" style="width:100%;" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="alertDialog=false">取消</el-button>
        <el-button type="primary" @click="saveAlert">保存</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getInventory, setAlertQty } from '../../api/inventory'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
export default {
  data() {
    return {
      list: [], total: 0, loading: false,
      warehouses: [], warehouseMap: {}, productMap: {},
      alertDialog: false, alertForm: {},
      query: { current: 1, size: 10, warehouseId: null }
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
      const r = await getInventory(this.query).finally(() => { this.loading = false })
      this.list = r.data.records
      this.total = r.data.total
    },
    onFilter() { this.query.current = 1; this.loadData() },
    setAlert(row) { this.alertForm = { warehouseId: row.warehouseId, productId: row.productId, alertQty: row.alertQty }; this.alertDialog = true },
    async saveAlert() { await setAlertQty(this.alertForm); this.$message.success('预警值已更新'); this.alertDialog = false; this.loadData() }
  }
}
</script>
