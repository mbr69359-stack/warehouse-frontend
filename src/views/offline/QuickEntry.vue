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

export default {
  data() {
    return {
      saving: false,
      warehouses: [],
      products: [],
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
    online() { return networkState.online }
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
  },
  methods: {
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
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
              this.$router.back()
            } else {
              this.$message.error(result.rejectReason || '提交失败')
            }
          } else {
            await addPendingLog(entry)
            networkState.pendingCount++
            this.$message.success('已暂存，联网后自动同步')
            this.$router.back()
          }
        } finally {
          this.saving = false
        }
      })
    }
  }
}
</script>