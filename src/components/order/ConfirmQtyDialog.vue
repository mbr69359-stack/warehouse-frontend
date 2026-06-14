<template>
  <el-dialog :title="title" :visible.sync="visible" width="560px" :close-on-click-modal="false">
    <div v-loading="loading">
      <el-table :data="items" border>
        <el-table-column prop="productId" label="商品ID" width="100" />
        <el-table-column prop="planQty" label="计划数量" width="110" />
        <el-table-column :label="qtyLabel">
          <template slot-scope="{row}">
            <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:140px;" />
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div slot="footer">
      <el-button @click="visible=false">取消</el-button>
      <el-button :type="buttonType" :loading="confirming" @click="submit">确认实际数量</el-button>
    </div>
  </el-dialog>
</template>

<script>
// 入库/出库列表页「填写实际数量」弹窗。两页此前各有一份相同的弹窗与确认逻辑，
// 差异仅标题、数量列标签、确认按钮配色、计划数量字段与成功提示。
// 用法：父组件通过 ref 调用 open(orderId)，确认成功后 emit 'confirmed' 由父组件刷新列表。
export default {
  name: 'ConfirmQtyDialog',
  props: {
    title: { type: String, required: true },        // 填写实际入库数量 / 填写实际出库数量
    qtyLabel: { type: String, required: true },     // 实际入库数量 / 实际出库数量
    buttonType: { type: String, default: 'primary' }, // 确认按钮配色 success/danger
    successMsg: { type: String, required: true },   // 入库确认成功 / 出库确认成功
    fetchItems: { type: Function, required: true }, // (id) => Promise<{ data }>
    confirmFn: { type: Function, required: true },  // (id, payload) => Promise
    planField: { type: String, default: 'planQty' } // 明细里计划数量字段（入库 planQty / 出库 qty）
  },
  data() {
    return { visible: false, loading: false, confirming: false, orderId: null, items: [] }
  },
  methods: {
    async open(id) {
      this.items = []
      this.orderId = id
      this.visible = true
      this.loading = true
      try {
        const r = await this.fetchItems(id)
        this.items = (r.data || []).map(i => ({
          id: i.id, productId: i.productId,
          planQty: i[this.planField], actualQty: i[this.planField] || 0
        }))
      } finally {
        this.loading = false
      }
    },
    async submit() {
      this.confirming = true
      try {
        const payload = this.items.map(i => ({ itemId: i.id, actualQty: i.actualQty || 0 }))
        await this.confirmFn(this.orderId, payload)
        this.$message.success(this.successMsg)
        this.visible = false
        this.$emit('confirmed')
      } finally {
        this.confirming = false
      }
    }
  }
}
</script>
