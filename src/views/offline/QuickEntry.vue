<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>快速出入库</span>
      <el-tag v-if="!online" type="danger" size="mini" style="margin-left:8px;">离线模式</el-tag>
    </div>

    <el-form :model="form" :rules="rules" ref="form" label-width="80px" style="max-width:480px;">
      <el-form-item label="类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio-button label="IN">入库</el-radio-button>
          <el-radio-button label="OUT">出库</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="仓库" prop="warehouseId">
        <el-select v-model="form.warehouseId" placeholder="选择仓库" style="width:100%;">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="商品" prop="productId">
        <el-select v-model="form.productId" placeholder="搜索商品" filterable style="width:100%;">
          <el-option
            v-for="p in products"
            :key="p.id"
            :label="p.name + ' (' + p.skuCode + ')'"
            :value="p.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="数量" prop="qty">
        <el-input-number v-model="form.qty" :min="1" style="width:180px;" />
        <span v-if="form.type === 'OUT' && currentStock !== null"
          :style="{ marginLeft: '12px', fontSize: '13px', color: form.qty > currentStock ? '#F56C6C' : '#909399' }">
          当前库存：{{ currentStock }}
        </span>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>

    <div style="margin-top:20px;">
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ online ? '立即提交' : '暂存（离线）' }}
      </el-button>
      <el-button @click="$router.back()">取消</el-button>
    </div>
  </el-card>
</template>

<script>
import { networkState, refreshCache } from '../../utils/sync'
import { addPendingLog, getCache } from '../../utils/db'
import { batchSync } from '../../api/syncApi'
import { getProducts } from '../../api/product'
import { getWarehouses } from '../../api/warehouse'

const LS_WAREHOUSE = 'qe_last_warehouseId'
const LS_PRODUCT = 'qe_last_productId'

export default {
  data() {
    return {
      saving: false,
      warehouses: [],
      products: [],
      inventory: [],
      form: { type: 'IN', warehouseId: null, productId: null, qty: 1, remark: '' },
      rules: {
        type: [{ required: true }],
        warehouseId: [{ required: true, message: '请选择仓库' }],
        productId: [{ required: true, message: '请选择商品' }],
        qty: [{ required: true, type: 'number', min: 1 }]
      }
    }
  },
  computed: {
    online() { return networkState.online },
    currentStock() {
      if (!this.form.warehouseId || !this.form.productId) return null
      const record = this.inventory.find(
        r => r.warehouseId === this.form.warehouseId && r.productId === this.form.productId
      )
      return record ? record.qty : null
    }
  },
  async created() {
    if (this.online) {
      const [p, w] = await Promise.all([
        getProducts({ current: 1, size: 500 }),
        getWarehouses()
      ])
      this.products = p.data.records
      this.warehouses = w.data
      await refreshCache()
    } else {
      const [p, w] = await Promise.all([
        getCache('products'),
        getCache('warehouses')
      ])
      this.products = p || []
      this.warehouses = w || []
    }
    this.inventory = (await getCache('inventory')) || []
    this.restoreLastSelection()
  },
  methods: {
    restoreLastSelection() {
      const wId = localStorage.getItem(LS_WAREHOUSE)
      const pId = localStorage.getItem(LS_PRODUCT)
      if (wId) {
        const w = this.warehouses.find(w => String(w.id) === wId)
        if (w) this.form.warehouseId = w.id
      }
      if (pId) {
        const p = this.products.find(p => String(p.id) === pId)
        if (p) this.form.productId = p.id
      }
    },
    saveLastSelection() {
      if (this.form.warehouseId != null) localStorage.setItem(LS_WAREHOUSE, String(this.form.warehouseId))
      if (this.form.productId != null) localStorage.setItem(LS_PRODUCT, String(this.form.productId))
    },
    async checkStock() {
      if (this.form.type !== 'OUT') return true
      const stock = this.currentStock
      if (stock !== null && this.form.qty > stock) {
        return this.$confirm(
          `当前库存仅剩 ${stock}，出库 ${this.form.qty} 将导致负库存，是否继续？`,
          '库存不足',
          { type: 'warning', confirmButtonText: '仍然提交', cancelButtonText: '取消' }
        ).then(() => true).catch(() => false)
      }
      return true
    },
    resetFormAfterSubmit() {
      const { type, warehouseId, productId } = this.form
      this.form = { type, warehouseId, productId, qty: 1, remark: '' }
      this.$nextTick(() => this.$refs.form.clearValidate())
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        const proceed = await this.checkStock()
        if (!proceed) return
        this.saving = true
        try {
          const entry = {
            type: this.form.type,
            warehouseId: this.form.warehouseId,
            productId: this.form.productId,
            qty: this.form.type === 'OUT' ? -Math.abs(this.form.qty) : Math.abs(this.form.qty),
            remark: this.form.remark
          }
          if (this.online) {
            const res = await batchSync([{ ...entry, createdAt: new Date().toISOString() }])
            const result = res.data[0]
            if (result.success) {
              this.$message.success('提交成功')
              this.saveLastSelection()
              this.resetFormAfterSubmit()
            } else {
              this.$message.error(result.rejectReason || '提交失败')
            }
          } else {
            await addPendingLog(entry)
            networkState.pendingCount++
            this.$message.success('已暂存，联网后自动同步')
            this.saveLastSelection()
            this.resetFormAfterSubmit()
          }
        } finally {
          this.saving = false
        }
      })
    }
  }
}
</script>
