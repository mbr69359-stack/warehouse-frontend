<template>
  <el-card v-loading="loading">
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>入库单详情 — {{ order.orderNo }}</span>
      <el-tag v-if="order.status" :type="statusTagType(order.status)" style="margin-left:8px;">
        {{ statusLabel(order.status) }}
      </el-tag>
    </div>

    <el-descriptions :column="3" border style="margin-bottom:16px;">
      <el-descriptions-item label="仓库">{{ warehouseName }}</el-descriptions-item>
      <el-descriptions-item label="入库类型">{{ order.type==='PURCHASE'?'采购入库':'退货入库' }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ order.createTime }}</el-descriptions-item>
      <el-descriptions-item label="确认时间">{{ order.confirmTime || '—' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ order.remark || '—' }}</el-descriptions-item>
    </el-descriptions>

    <el-table :data="items" border stripe>
      <el-table-column label="商品" min-width="200">
        <template slot-scope="{row}">
          {{ row.productName || row.productId }}
          <span v-if="row.skuCode" style="color:#909399;font-size:12px;"> ({{ row.skuCode }})</span>
        </template>
      </el-table-column>
      <el-table-column prop="planQty" label="计划数量" width="110" />
      <el-table-column prop="actualQty" label="实际数量" width="110" />
      <el-table-column label="单价" width="100"><template slot-scope="{row}">KSh {{ row.price }}</template></el-table-column>
      <el-table-column label="小计">
        <template slot-scope="{row}">
          KSh {{ subtotal(row) }}
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:16px;" v-if="order.status==='DRAFT'">
      <el-button type="success" @click="openConfirmDialog">确认入库</el-button>
    </div>

    <!-- 确认入库弹窗 -->
    <el-dialog title="填写实际入库数量" :visible.sync="dialogVisible" width="560px" :close-on-click-modal="false">
      <el-table :data="confirmItems" border>
        <el-table-column label="商品" min-width="160">
          <template slot-scope="{row}">
            {{ row.productName || row.productId }}
          </template>
        </el-table-column>
        <el-table-column prop="planQty" label="计划数量" width="110" />
        <el-table-column label="实际入库数量">
          <template slot-scope="{row}">
            <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:140px;" />
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="success" :loading="confirming" @click="submitConfirm">确认实际数量</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getInOrder, confirmInOrder, getInOrderItems } from '../../api/inOrder'
import { getWarehouses } from '../../api/warehouse'
export default {
  data() {
    return {
      order: {}, items: [], loading: false,
      warehouses: [],
      dialogVisible: false, confirming: false,
      confirmItems: []
    }
  },
  computed: {
    warehouseName() {
      if (!this.order.warehouseId) return '—'
      const w = this.warehouses.find(w => w.id === this.order.warehouseId)
      return w ? w.name : this.order.warehouseId
    }
  },
  created() { this.loadData() },
  methods: {
    statusTagType(status) {
      return status === 'CONFIRMED' ? 'success' : status === 'VOIDED' ? 'info' : 'warning'
    },
    statusLabel(status) {
      return status === 'CONFIRMED' ? '已确认' : status === 'VOIDED' ? '已作废' : '草稿'
    },
    subtotal(row) {
      // 已确认/已作废单按实际数量计算，草稿按计划数量
      const qty = this.order.status === 'DRAFT' ? (row.planQty || 0) : (row.actualQty || 0)
      return (Math.round(qty * Number(row.price || 0) * 100) / 100).toFixed(2)
    },
    async loadData() {
      this.loading = true
      const id = this.$route.params.id
      try {
        const [orderRes, itemRes, warehouseRes] = await Promise.all([
          getInOrder(id),
          getInOrderItems(id),
          getWarehouses()
        ])
        this.order = orderRes.data || {}
        this.items = itemRes.data || []
        this.warehouses = warehouseRes.data || []
      } finally {
        this.loading = false
      }
    },
    openConfirmDialog() {
      this.confirmItems = this.items.map(i => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        planQty: i.planQty,
        actualQty: i.planQty || 0
      }))
      this.dialogVisible = true
    },
    async submitConfirm() {
      this.confirming = true
      try {
        const payload = this.confirmItems.map(i => ({ itemId: i.id, actualQty: i.actualQty || 0 }))
        await confirmInOrder(this.$route.params.id, payload)
        this.$message.success('入库确认成功')
        this.dialogVisible = false
        this.loadData()
      } finally {
        this.confirming = false
      }
    }
  }
}
</script>