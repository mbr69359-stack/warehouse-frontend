<template>
  <el-card v-loading="loading">
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>{{ docLabel }}详情 — {{ order.orderNo }}</span>
      <el-tag v-if="order.status" :type="statusTagType(order.status)" style="margin-left:8px;">
        {{ statusLabel(order.status) }}
      </el-tag>
    </div>

    <!-- 描述区差异较大（出库含客户/销售渠道/动态跨列），整块交由各页通过插槽提供 -->
    <slot name="descriptions" :order="order" :warehouse-name="warehouseName" />

    <el-table :data="items" border stripe>
      <el-table-column label="商品" min-width="200">
        <template slot-scope="{row}">
          {{ row.productName || row.productId }}
          <span v-if="row.skuCode" style="color:#909399;font-size:12px;"> ({{ row.skuCode }})</span>
        </template>
      </el-table-column>
      <el-table-column :prop="planField" :label="qtyIsBox ? '计划数量(箱)' : '计划数量'" width="110" />
      <el-table-column prop="actualQty" :label="qtyIsBox ? '实际数量(箱)' : '实际数量'" width="110" />
      <el-table-column :label="priceLabel" width="100"><template slot-scope="{row}">KSh {{ row.price }}</template></el-table-column>
      <el-table-column label="重量" width="100">
        <template slot-scope="{row}">{{ formatWeight(rowWeight(row)) }}</template>
      </el-table-column>
      <el-table-column label="小计">
        <template slot-scope="{row}">
          KSh {{ subtotal(row) }}
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:12px;text-align:right;font-size:14px;">
      <span v-if="qtyIsBox" style="margin-right:16px;">总箱数：<strong>{{ totals.boxes }}</strong> 箱</span>
      <span style="margin-right:16px;">总件数：<strong>{{ totals.pieces != null ? totals.pieces + ' 个' : '—' }}</strong></span>
      <span style="margin-right:16px;">总重量：<strong>{{ totals.weight != null ? totals.weight.toFixed(1) + ' kg' : '—' }}</strong></span>
      <span>合计金额：<strong>KSh {{ totals.amount.toFixed(2) }}</strong></span>
    </div>

    <div style="margin-top:16px;display:flex;gap:10px;">
      <el-button v-if="order.status==='DRAFT'" :type="confirmButtonType" @click="openConfirmDialog">{{ confirmLabel }}</el-button>
      <el-button icon="el-icon-printer" @click="printOrder">打印单据</el-button>
    </div>

    <!-- 确认数量弹窗 -->
    <el-dialog :title="confirmDialogTitle" :visible.sync="dialogVisible" width="560px" :close-on-click-modal="false">
      <el-table :data="confirmItems" border>
        <el-table-column label="商品" min-width="160">
          <template slot-scope="{row}">
            {{ row.productName || row.productId }}
          </template>
        </el-table-column>
        <el-table-column prop="planQty" label="计划数量" width="110" />
        <el-table-column :label="confirmQtyLabel">
          <template slot-scope="{row}">
            <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:140px;" />
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button :type="confirmButtonType" :loading="confirming" @click="submitConfirm">确认实际数量</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getWarehouses } from '../../api/warehouse'
import { lineWeightKg, formatWeight } from '../../utils/unit'
import { printOrderDocument } from '../../utils/printOrder'

export default {
  name: 'OrderDetailView',
  props: {
    // 接口
    fetchOrder: { type: Function, required: true },   // (id) => Promise<{ data }>
    fetchItems: { type: Function, required: true },   // (id) => Promise<{ data }>
    confirmOrder: { type: Function, required: true }, // (id, payload) => Promise
    // 文案/配色
    docLabel: { type: String, required: true },        // 入库单 / 出库单
    confirmButtonType: { type: String, default: 'success' }, // 确认按钮配色
    confirmLabel: { type: String, required: true },    // 确认入库 / 确认出库
    confirmDialogTitle: { type: String, required: true },
    confirmQtyLabel: { type: String, required: true }, // 实际入库数量 / 实际出库数量
    confirmSuccessMsg: { type: String, required: true },
    // 业务字段
    planField: { type: String, default: 'planQty' },   // 明细里计划数量字段（入库 planQty / 出库 qty）
    boxModeExcludeTypes: { type: Array, default: () => [] }, // 不按箱计的单据类型
    // 打印
    printTypeFieldLabel: { type: String, required: true }, // 入库类型 / 出库类型
    printTypeMap: { type: Object, required: true },    // 打印小票里类型显示映射
    priceLabel: { type: String, default: '单价' }      // 价格列表头：入库单为「成本价」，出库单为「单价」
  },
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
    },
    // 与后端确认逻辑一致：BOX 仓数量按箱记；出库的损坏/补发类型按个，故由 boxModeExcludeTypes 排除
    qtyIsBox() {
      const w = this.warehouses.find(w => w.id === this.order.warehouseId)
      return !!w && w.type === 'BOX' && !this.boxModeExcludeTypes.includes(this.order.type)
    },
    totals() {
      let boxes = 0, piecesSum = 0, piecesOk = true, weight = 0, hasWeight = false, amount = 0
      this.items.forEach(r => {
        const qty = this.effectiveQty(r)
        amount += qty * Number(r.price || 0)
        if (this.qtyIsBox) {
          boxes += qty
          if (r.qtyPerBox > 0) piecesSum += qty * r.qtyPerBox
          else piecesOk = false
        } else {
          piecesSum += qty
        }
        const w = this.rowWeight(r)
        if (w != null) { weight += w; hasWeight = true }
      })
      return {
        boxes,
        pieces: piecesOk ? piecesSum : null,
        weight: hasWeight ? weight : null,
        amount: Math.round(amount * 100) / 100
      }
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
      return (Math.round(this.effectiveQty(row) * Number(row.price || 0) * 100) / 100).toFixed(2)
    },
    // 已确认/已作废单按实际数量计算，草稿按计划数量
    effectiveQty(row) {
      return this.order.status === 'DRAFT' ? (row[this.planField] || 0) : (row.actualQty || 0)
    },
    formatWeight,
    rowWeight(row) {
      return lineWeightKg(this.effectiveQty(row), row.weightPerBox, row.qtyPerBox, this.qtyIsBox)
    },
    async loadData() {
      this.loading = true
      const id = this.$route.params.id
      try {
        const [orderRes, itemRes, warehouseRes] = await Promise.all([
          this.fetchOrder(id),
          this.fetchItems(id),
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
        planQty: i[this.planField],
        actualQty: i[this.planField] || 0
      }))
      this.dialogVisible = true
    },
    printOrder() {
      printOrderDocument({
        docLabel: this.docLabel,
        typeFieldLabel: this.printTypeFieldLabel,
        typeText: this.printTypeMap[this.order.type] || this.order.type || '—',
        statusText: this.statusLabel(this.order.status),
        warehouseName: this.warehouseName,
        qtyIsBox: this.qtyIsBox,
        order: this.order,
        totals: this.totals,
        priceLabel: this.priceLabel,
        rows: this.items.map(r => ({
          name: r.productName || r.productId,
          sku: r.skuCode,
          planQty: r[this.planField],
          actualQty: r.actualQty,
          price: Number(r.price || 0),
          weightKg: this.rowWeight(r),
          subtotal: this.effectiveQty(r) * Number(r.price || 0)
        }))
      })
    },
    async submitConfirm() {
      this.confirming = true
      try {
        const payload = this.confirmItems.map(i => ({ itemId: i.id, actualQty: i.actualQty || 0 }))
        await this.confirmOrder(this.$route.params.id, payload)
        this.$message.success(this.confirmSuccessMsg)
        this.dialogVisible = false
        this.loadData()
      } finally {
        this.confirming = false
      }
    }
  }
}
</script>
