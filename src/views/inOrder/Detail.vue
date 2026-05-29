<template>
  <el-card v-loading="loading">
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>入库单详情 — {{ order.orderNo }}</span>
      <el-tag v-if="order.status" :type="order.status==='CONFIRMED'?'success':'warning'" style="margin-left:8px;">
        {{ order.status==='CONFIRMED'?'已确认':'草稿' }}
      </el-tag>
    </div>
    <el-descriptions :column="3" border style="margin-bottom:16px;">
      <el-descriptions-item label="仓库ID">{{ order.warehouseId }}</el-descriptions-item>
      <el-descriptions-item label="入库类型">{{ order.type==='PURCHASE'?'采购入库':'退货入库' }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ order.createTime }}</el-descriptions-item>
      <el-descriptions-item label="确认时间">{{ order.confirmTime || '—' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ order.remark || '—' }}</el-descriptions-item>
    </el-descriptions>
    <el-table :data="items" border stripe>
      <el-table-column prop="productId" label="商品ID" width="100" />
      <el-table-column prop="planQty" label="计划数量" width="110" />
      <el-table-column prop="actualQty" label="实际数量" width="110" />
      <el-table-column label="单价" width="100"><template slot-scope="{row}">¥{{ row.price }}</template></el-table-column>
      <el-table-column label="小计"><template slot-scope="{row}">¥{{ (row.actualQty * row.price).toFixed(2) }}</template></el-table-column>
    </el-table>
    <div style="margin-top:16px;" v-if="order.status==='DRAFT'">
      <el-button type="success" @click="handleConfirm">确认入库</el-button>
    </div>
  </el-card>
</template>

<script>
import { getInOrders, confirmInOrder, getInOrderItems } from '../../api/inOrder'
export default {
  data() { return { order: {}, items: [], loading: false } },
  created() { this.loadData() },
  methods: {
    async loadData() {
      this.loading = true
      const id = this.$route.params.id
      const [listRes, itemRes] = await Promise.all([
        getInOrders({ current: 1, size: 200 }),
        getInOrderItems(id)
      ]).finally(() => { this.loading = false })
      this.order = (listRes.data.records || []).find(o => String(o.id) === String(id)) || {}
      this.items = itemRes.data || []
    },
    async handleConfirm() {
      await this.$confirm('确认入库后库存将增加，是否继续？', '提示', { type: 'warning' })
      await confirmInOrder(this.$route.params.id)
      this.$message.success('入库确认成功'); this.loadData()
    }
  }
}
</script>
