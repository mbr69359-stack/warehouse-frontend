<template>
  <el-card>
    <div slot="header">库存盘点</div>
    <el-form label-width="90px" style="max-width:400px;margin-bottom:16px;">
      <el-form-item label="选择仓库">
        <el-select v-model="warehouseId" placeholder="请选择仓库" style="width:100%;" @change="loadInventory">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="remark" type="textarea" /></el-form-item>
    </el-form>
    <el-table :data="items" border v-loading="loading">
      <el-table-column label="商品" min-width="160">
        <template slot-scope="{row}">{{ productMap[row.productId] || row.productId }}</template>
      </el-table-column>
      <el-table-column label="系统库存" width="110" align="center">
        <template slot-scope="{row}">{{ row.systemQty }}</template>
      </el-table-column>
      <el-table-column label="实际数量" width="160" align="center">
        <template slot-scope="{row}">
          <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:120px;" />
        </template>
      </el-table-column>
      <el-table-column label="差异" width="90" align="center">
        <template slot-scope="{row}">
          <span :style="{color:row.actualQty===row.systemQty?'#67C23A':'#F56C6C',fontWeight:'bold'}">
            {{ row.actualQty - row.systemQty > 0 ? '+' : '' }}{{ row.actualQty - row.systemQty }}
          </span>
        </template>
      </el-table-column>
    </el-table>
    <div style="margin-top:16px;">
      <el-button type="primary" :loading="saving" :disabled="!warehouseId||items.length===0" @click="handleSubmit">提交盘点</el-button>
    </div>
  </el-card>
</template>

<script>
import { getInventory, submitCheck } from '../../api/inventory'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
export default {
  data() { return { saving: false, loading: false, warehouses: [], warehouseId: null, remark: '', items: [], productMap: {} } },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data || [] })
    getProducts({ size: 1000 }).then(r => {
      const items = r.data.records || r.data || []
      this.productMap = Object.fromEntries(items.map(p => [p.id, p.name]))
    })
  },
  methods: {
    async loadInventory(wid) {
      this.loading = true
      const r = await getInventory({ warehouseId: wid, current: 1, size: 200 }).finally(() => { this.loading = false })
      this.items = (r.data.records || []).map(inv => ({ productId: inv.productId, systemQty: inv.qty, actualQty: inv.qty }))
    },
    async handleSubmit() {
      await this.$confirm('提交盘点后库存将按实际数量更新，是否继续？', '提示', { type: 'warning' })
      this.saving = true
      try {
        await submitCheck({ warehouseId: this.warehouseId, remark: this.remark, items: this.items.map(i => ({ productId: i.productId, actualQty: i.actualQty })) })
        this.$message.success('盘点提交成功'); this.items = []
      } finally { this.saving = false }
    }
  }
}
</script>
