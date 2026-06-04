<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>新建出库单</span>
    </div>
    <el-form :model="form" :rules="currentRules" ref="form" label-width="100px" style="max-width:600px;">
      <el-form-item label="仓库" prop="warehouseId">
        <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width:100%;" @change="onWarehouseChange">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="出库类型" prop="type">
        <el-radio-group v-model="form.type" @change="onTypeChange">
          <el-radio label="SALE">销售出库</el-radio>
          <el-radio label="TRANSFER">调拨出库</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.type === 'TRANSFER'" label="目标仓库" prop="targetWarehouseId">
        <el-select v-model="form.targetWarehouseId" placeholder="请选择目标仓库" style="width:100%;">
          <el-option
            v-for="w in targetWarehouses"
            :key="w.id"
            :label="w.name"
            :value="w.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
    </el-form>
    <div style="margin:16px 0 8px;font-weight:bold;">出库明细</div>
    <el-tooltip :disabled="!!form.warehouseId" content="请先选择仓库" placement="top">
      <span>
        <el-button
          type="primary"
          size="small"
          icon="el-icon-plus"
          @click="addItem"
          :disabled="!form.warehouseId"
          style="margin-bottom:12px;"
        >添加商品</el-button>
      </span>
    </el-tooltip>
    <el-table :data="form.items" border>
      <el-table-column label="商品" min-width="260">
        <template slot-scope="{row}">
          <el-select v-model="row.productId" placeholder="选择商品" filterable style="width:100%;" @change="onProductChange(row)">
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="productLabel(p)"
              :value="p.id"
              :disabled="(inventoryMap[p.id] || 0) === 0"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="可用库存" width="90" align="center">
        <template slot-scope="{row}">
          <span :style="row.productId && row.qty >= (inventoryMap[row.productId] || 0) ? 'color:#f56c6c;font-weight:bold;' : ''">
            {{ row.productId ? (inventoryMap[row.productId] || 0) : '—' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="130">
        <template slot-scope="{row}">
          <el-input-number
            v-model="row.qty"
            :min="1"
            :max="row.productId ? (inventoryMap[row.productId] || 1) : undefined"
            size="small"
            style="width:100%;"
          />
        </template>
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
import { getInventory } from '../../api/inventory'

export default {
  data() {
    return {
      saving: false,
      warehouses: [],
      products: [],
      inventoryMap: {},
      form: { warehouseId: null, targetWarehouseId: null, type: 'SALE', remark: '', items: [] },
      baseRules: {
        warehouseId: [{ required: true, message: '请选择仓库' }],
        type: [{ required: true, message: '请选择类型' }]
      },
      transferRules: {
        warehouseId: [{ required: true, message: '请选择仓库' }],
        type: [{ required: true, message: '请选择类型' }],
        targetWarehouseId: [{ required: true, message: '请选择目标仓库', trigger: 'change' }]
      }
    }
  },
  computed: {
    currentRules() {
      return this.form.type === 'TRANSFER' ? this.transferRules : this.baseRules
    },
    targetWarehouses() {
      return this.warehouses.filter(w => w.id !== this.form.warehouseId)
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    getProducts({ current: 1, size: 200 }).then(r => { this.products = r.data.records })
  },
  methods: {
    onWarehouseChange(warehouseId) {
      this.form.items = []
      this.form.targetWarehouseId = null
      this.inventoryMap = {}
      if (!warehouseId) return
      getInventory({ warehouseId, size: 2000 }).then(r => {
        const map = {}
        const records = r.data.records || r.data || []
        records.forEach(item => { map[item.productId] = item.qty })
        this.inventoryMap = map
      })
    },
    onTypeChange(type) {
      if (type !== 'TRANSFER') {
        this.form.targetWarehouseId = null
      }
    },
    productLabel(p) {
      const stock = this.inventoryMap[p.id] !== undefined ? this.inventoryMap[p.id] : '—'
      return `${p.name}(${p.skuCode}) — 库存:${stock}件`
    },
    addItem() { this.form.items.push({ productId: null, qty: 1, price: 0 }) },
    onProductChange(row) {
      const max = this.inventoryMap[row.productId] || 1
      if (row.qty > max) row.qty = max
    },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.items.length === 0) {
          this.$message.warning('请至少添加一条出库明细')
          return
        }
        const emptyItem = this.form.items.find(i => !i.productId)
        if (emptyItem) {
          this.$message.warning('存在未选择商品的明细行，请补充或删除')
          return
        }
        const overItem = this.form.items.find(i => i.qty > (this.inventoryMap[i.productId] || 0))
        if (overItem) {
          const prod = this.products.find(p => p.id === overItem.productId)
          const avail = this.inventoryMap[overItem.productId] || 0
          this.$message.error(`商品「${prod ? prod.name : overItem.productId}」库存仅剩 ${avail} 件，出库数量不能超过库存`)
          return
        }
        this.saving = true
        try {
          await createOutOrder(this.form)
          this.$message.success('出库单创建成功')
          this.$router.push('/out-orders')
        } finally {
          this.saving = false }
      })
    }
  }
}
</script>