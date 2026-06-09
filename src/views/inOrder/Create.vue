<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>新建入库单</span>
    </div>
    <el-form :model="form" :rules="rules" ref="form" label-width="100px" style="max-width:600px;">
      <el-form-item label="仓库" prop="warehouseId">
        <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width:100%;">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="供应商">
        <el-select v-model="form.supplierId" placeholder="请选择供应商" clearable style="width:100%;">
          <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="入库类型" prop="type">
        <el-radio-group v-model="form.type"><el-radio label="PURCHASE">采购入库</el-radio><el-radio label="RETURN">退货入库</el-radio></el-radio-group>
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
    </el-form>
    <div style="margin:16px 0 8px;font-weight:bold;">入库明细</div>
    <el-button type="primary" size="small" icon="el-icon-plus" @click="addItem" style="margin-bottom:12px;">添加商品</el-button>
    <el-table :data="form.items" border>
      <el-table-column label="商品" min-width="200">
        <template slot-scope="{row}">
          <el-select v-model="row.productId" placeholder="输入名称搜索商品" filterable remote
            :remote-method="searchProducts" :loading="productLoading" style="width:100%;">
            <el-option v-for="p in products" :key="p.id" :label="p.name+'('+p.skuCode+')'" :value="p.id" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="计划数量" width="120">
        <template slot-scope="{row}"><el-input-number v-model="row.planQty" :min="0" size="small" style="width:100%;" /></template>
      </el-table-column>
      <el-table-column label="单价" width="130">
        <template slot-scope="{row}"><el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width:100%;" /></template>
      </el-table-column>
      <el-table-column label="预计总重量" width="110">
        <template slot-scope="{row}">
          <span v-if="productMap[row.productId] && productMap[row.productId].weightPerBox">
            {{ ((row.planQty || 0) * productMap[row.productId].weightPerBox).toFixed(1) }} kg
          </span>
          <span v-else style="color:#c0c4cc;">—</span>
        </template>
      </el-table-column>
      <el-table-column label="" width="36">
        <template slot-scope="{row}">
          <el-tooltip v-if="showQtyPerBoxWarn(row)" content="该商品未设每箱数量，库存将以箱为单位存入，无法换算个数" placement="top">
            <i class="el-icon-warning" style="color:#E6A23C;font-size:16px;cursor:help;"></i>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="70">
        <template slot-scope="{$index}"><el-button type="danger" size="mini" icon="el-icon-delete" circle @click="form.items.splice($index,1)" /></template>
      </el-table-column>
    </el-table>
    <div v-if="totalWeight > 0" style="margin-top:10px;text-align:right;color:#606266;font-size:13px;">
      预计入库总重量：<strong>{{ totalWeight }} kg</strong>
    </div>
    <div style="margin-top:20px;">
      <el-button type="primary" :loading="saving" @click="handleSave">保存草稿</el-button>
      <el-button @click="$router.back()">取消</el-button>
    </div>
  </el-card>
</template>

<script>
import { createInOrder } from '../../api/inOrder'
import { getWarehouses } from '../../api/warehouse'
import { getSuppliers } from '../../api/supplier'
import { getProducts } from '../../api/product'
export default {
  computed: {
    productMap() {
      return Object.fromEntries(this.products.map(p => [p.id, p]))
    },
    selectedWarehouseType() {
      const w = this.warehouses.find(wh => wh.id === this.form.warehouseId)
      return w ? w.type : null
    },
    totalWeight() {
      return this.form.items.reduce((sum, row) => {
        const p = this.productMap[row.productId]
        return p && p.weightPerBox ? sum + (row.planQty || 0) * p.weightPerBox : sum
      }, 0).toFixed(1)
    }
  },
  data() {
    return {
      saving: false, warehouses: [], suppliers: [], products: [], productLoading: false,
      form: { warehouseId: null, supplierId: null, type: 'PURCHASE', remark: '', items: [] },
      rules: { warehouseId: [{ required: true, message: '请选择仓库' }], type: [{ required: true, message: '请选择类型' }] }
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    getSuppliers({ current: 1, size: 100 }).then(r => { this.suppliers = r.data.records })
  },
  methods: {
    searchProducts(query) {
      if (!query) return
      this.productLoading = true
      getProducts({ current: 1, size: 20, name: query })
        .then(r => {
          const incoming = r.data.records
          const seen = new Set(this.products.map(p => p.id))
          this.products = [...this.products, ...incoming.filter(p => !seen.has(p.id))]
        })
        .finally(() => { this.productLoading = false })
    },
    showQtyPerBoxWarn(row) {
      if (this.selectedWarehouseType !== 'BOX') return false
      const p = this.productMap[row.productId]
      return p && (!p.qtyPerBox || p.qtyPerBox <= 0)
    },
    addItem() { this.form.items.push({ productId: null, planQty: 0, price: 0 }) },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.items.length === 0) {
          this.$message.warning('请至少添加一条入库明细')
          return
        }
        const emptyItem = this.form.items.find(i => !i.productId)
        if (emptyItem) {
          this.$message.warning('存在未选择商品的明细行，请补充或删除')
          return
        }
        this.saving = true
        try { await createInOrder(this.form); this.$message.success('入库单创建成功'); this.$router.push('/in-orders') }
        finally { this.saving = false }
      })
    }
  }
}
</script>
