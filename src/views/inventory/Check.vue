<template>
  <el-card>
    <div slot="header">库存盘点</div>
    <el-form label-width="90px" style="max-width:460px;margin-bottom:16px;">
      <el-form-item label="选择仓库">
        <el-select v-model="warehouseId" placeholder="请选择仓库" style="width:100%;" @change="loadInventory">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="查看单位" v-if="warehouseId">
        <el-radio-group v-model="displayMode" size="small">
          <el-radio-button label="box">按箱查看</el-radio-button>
          <el-radio-button label="piece">按个查看</el-radio-button>
        </el-radio-group>
        <span v-if="displayMode==='box' && selectedWarehouse && selectedWarehouse.type==='PIECE'"
          style="margin-left:8px;font-size:12px;color:#909399;">该仓库按个管理，不支持按箱</span>
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="remark" type="textarea" /></el-form-item>
    </el-form>
    <el-table :data="items" border v-loading="loading">
      <el-table-column label="商品" min-width="160">
        <template slot-scope="{row}">{{ productMap[row.productId]?.name || row.productId }}</template>
      </el-table-column>
      <el-table-column label="系统库存" width="130" align="center">
        <template slot-scope="{row}">{{ fmtQty(row.systemQty, row.productId) }}</template>
      </el-table-column>
      <el-table-column label="实际数量" min-width="220" align="center">
        <template slot-scope="{row}">
          <template v-if="rowBoxEditable(row)">
            <el-input-number :value="boxPart(row)" @input="v => setBox(row, v)" :min="0" size="small"
              controls-position="right" style="width:92px;" />
            <span style="margin:0 4px;color:#909399;">箱</span>
            <el-input-number :value="loosePart(row)" @input="v => setLoose(row, v)" :min="0"
              :max="qtyPerBoxOf(row.productId) - 1" size="small" controls-position="right" style="width:92px;" />
            <span style="margin-left:4px;color:#909399;">个</span>
          </template>
          <template v-else>
            <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:120px;" />
            <span style="margin-left:6px;color:#909399;">{{ isBoxView ? '箱' : '个' }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="差异" width="120" align="center">
        <template slot-scope="{row}">
          <span :style="{color:row.actualQty===row.systemQty?'#67C23A':'#F56C6C',fontWeight:'bold'}">
            {{ fmtDiff(row) }}
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
  computed: {
    displayMode: {
      get() { return this.$store.state.displayUnit },
      set(v) { this.$store.commit('SET_DISPLAY_UNIT', v) }
    },
    selectedWarehouse() { return this.warehouses.find(w => w.id === this.warehouseId) },
    // 按箱视图仅对 BOX 仓生效（与 List.vue 一致：PIECE 仓恒按个显示）
    isBoxView() {
      return this.displayMode === 'box' && !!this.selectedWarehouse && this.selectedWarehouse.type === 'BOX'
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data || [] })
    getProducts({ size: 1000 }).then(r => {
      const items = r.data.records || r.data || []
      this.productMap = Object.fromEntries(items.map(p => [p.id, p]))
    })
  },
  methods: {
    // 商品已设每箱数量（>0）则返回该值，否则返回 0（无法换算，库存按箱计）
    qtyPerBoxOf(productId) {
      const p = this.productMap[productId]
      return p && p.qtyPerBox > 0 ? Number(p.qtyPerBox) : 0
    },
    // 该行是否用「箱+零散个」双框录入：按箱视图且商品已设每箱数量
    rowBoxEditable(row) {
      return this.isBoxView && this.qtyPerBoxOf(row.productId) > 0
    },
    boxPart(row) {
      const qpb = this.qtyPerBoxOf(row.productId)
      return qpb ? Math.floor((Number(row.actualQty) || 0) / qpb) : 0
    },
    loosePart(row) {
      const qpb = this.qtyPerBoxOf(row.productId)
      return qpb ? (Number(row.actualQty) || 0) % qpb : 0
    },
    setBox(row, boxes) {
      const qpb = this.qtyPerBoxOf(row.productId)
      row.actualQty = (Number(boxes) || 0) * qpb + this.loosePart(row)
    },
    setLoose(row, loose) {
      const qpb = this.qtyPerBoxOf(row.productId)
      row.actualQty = this.boxPart(row) * qpb + (Number(loose) || 0)
    },
    // 库存数量展示（个数转当前单位文案）
    fmtQty(qty, productId) {
      qty = Number(qty) || 0
      if (!this.isBoxView) return `${qty} 个`
      const qpb = this.qtyPerBoxOf(productId)
      if (!qpb) return `${qty} 箱`
      const boxes = Math.floor(qty / qpb)
      const loose = qty % qpb
      return loose > 0 ? `${boxes}箱${loose}个` : `${boxes}箱`
    },
    fmtDiff(row) {
      const delta = (Number(row.actualQty) || 0) - (Number(row.systemQty) || 0)
      if (!this.isBoxView) return delta > 0 ? `+${delta}` : `${delta}`
      const qpb = this.qtyPerBoxOf(row.productId)
      if (!qpb) return delta > 0 ? `+${delta}箱` : `${delta}箱`
      const sign = delta > 0 ? '+' : delta < 0 ? '-' : ''
      const abs = Math.abs(delta)
      const boxes = Math.floor(abs / qpb)
      const loose = abs % qpb
      const text = boxes > 0 ? (loose > 0 ? `${boxes}箱${loose}个` : `${boxes}箱`) : `${loose}个`
      return `${sign}${text}`
    },
    async loadInventory(wid) {
      this.loading = true
      try {
        const PAGE_SIZE = 200
        let current = 1
        let allRecords = []
        while (true) {
          const r = await getInventory({ warehouseId: wid, current, size: PAGE_SIZE })
          const page = r.data
          allRecords = allRecords.concat(page.records || [])
          if (allRecords.length >= page.total || (page.records || []).length < PAGE_SIZE) break
          current++
        }
        this.items = allRecords.map(inv => ({ productId: inv.productId, systemQty: inv.qty, actualQty: inv.qty }))
      } finally {
        this.loading = false
      }
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
