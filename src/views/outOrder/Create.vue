<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>新建出库单</span>
    </div>
    <el-form :model="form" :rules="rules" ref="form" label-width="100px" style="max-width:600px;">
      <el-form-item label="仓库" prop="warehouseId">
        <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width:100%;">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="出库类型" prop="type">
        <el-radio-group v-model="form.type"><el-radio label="SALE">销售出库</el-radio><el-radio label="TRANSFER">调拨出库</el-radio></el-radio-group>
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
    </el-form>
    <div style="margin:16px 0 8px;font-weight:bold;">出库明细</div>
    <el-button type="primary" size="small" icon="el-icon-plus" @click="addItem" style="margin-bottom:12px;">添加商品</el-button>
    <el-table :data="form.items" border>
      <el-table-column label="商品" min-width="200">
        <template slot-scope="{row}">
          <el-select v-model="row.productId" placeholder="选择商品" filterable style="width:100%;">
            <el-option v-for="p in products" :key="p.id" :label="p.name+'('+p.skuCode+')'" :value="p.id" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="120">
        <template slot-scope="{row}"><el-input-number v-model="row.qty" :min="1" size="small" style="width:100%;" /></template>
      </el-table-column>
      <el-table-column label="单价" width="130">
        <template slot-scope="{row}"><el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width:100%;" /></template>
      </el-table-column>
      <el-table-column label="操作" width="70">
        <template slot-scope="{$index}"><el-button type="danger" size="mini" icon="el-icon-delete" circle @click="form.items.splice($index,1)" /></template>
      </el-table-column>
    </el-table>
    <div style="margin-top:20px;">
      <el-button type="primary" :loading="saving" @click="handleSave">保存草稿</el-button>
      <el-button @click="$router.back()">取消</el-button>
    </div>
  </el-card>
</template>

<script>
import { createOutOrder } from '../../api/outOrder'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
export default {
  data() {
    return {
      saving: false, warehouses: [], products: [],
      form: { warehouseId: null, type: 'SALE', remark: '', items: [] },
      rules: { warehouseId: [{ required: true, message: '请选择仓库' }], type: [{ required: true, message: '请选择类型' }] }
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    getProducts({ current: 1, size: 200 }).then(r => { this.products = r.data.records })
  },
  methods: {
    addItem() { this.form.items.push({ productId: null, qty: 1, price: 0 }) },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        try { await createOutOrder(this.form); this.$message.success('出库单创建成功'); this.$router.push('/out-orders') }
        finally { this.saving = false }
      })
    }
  }
}
</script>
