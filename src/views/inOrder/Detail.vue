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
      <el-table-column prop="planQty" :label="qtyIsBox ? '计划数量(箱)' : '计划数量'" width="110" />
      <el-table-column prop="actualQty" :label="qtyIsBox ? '实际数量(箱)' : '实际数量'" width="110" />
      <el-table-column label="单价" width="100"><template slot-scope="{row}">KSh {{ row.price }}</template></el-table-column>
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
      <el-button v-if="order.status==='DRAFT'" type="success" @click="openConfirmDialog">确认入库</el-button>
      <el-button icon="el-icon-printer" @click="printOrder">打印单据</el-button>
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
import { lineWeightKg, formatWeight } from '../../utils/unit'
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
    },
    // 与后端确认逻辑一致：BOX 仓入库数量按箱记
    qtyIsBox() {
      const w = this.warehouses.find(w => w.id === this.order.warehouseId)
      return !!w && w.type === 'BOX'
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
      return this.order.status === 'DRAFT' ? (row.planQty || 0) : (row.actualQty || 0)
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
    printOrder() {
      const typeMap = { PURCHASE: '采购入库', RETURN: '退货入库' }
      const totals = this.totals
      const boxSuffix = this.qtyIsBox ? '(箱)' : ''
      const rows = this.items.map(r => {
        const qty = this.effectiveQty(r)
        const sub = (qty * Number(r.price || 0)).toFixed(2)
        const w = this.rowWeight(r)
        return `<tr>
          <td>${r.productName || r.productId}${r.skuCode ? '<br><small style="color:#888">' + r.skuCode + '</small>' : ''}</td>
          <td style="text-align:center">${r.planQty}</td>
          <td style="text-align:center">${r.actualQty ?? '—'}</td>
          <td style="text-align:right">KSh ${Number(r.price || 0).toFixed(2)}</td>
          <td style="text-align:right">${w != null ? w.toFixed(1) + ' kg' : '—'}</td>
          <td style="text-align:right">KSh ${sub}</td>
        </tr>`
      }).join('')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>入库单 ${this.order.orderNo}</title>
        <style>
          body { font-family: "Microsoft YaHei", sans-serif; padding: 32px; color: #222; }
          h2 { margin: 0 0 4px; font-size: 20px; }
          .meta { display: flex; gap: 40px; margin: 16px 0; font-size: 13px; color: #555; }
          .meta span { display: flex; flex-direction: column; }
          .meta b { font-size: 14px; color: #222; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th { background: #f5f5f5; padding: 8px 10px; border: 1px solid #ddd; text-align: left; }
          td { padding: 8px 10px; border: 1px solid #ddd; }
          .total { text-align: right; margin-top: 12px; font-size: 15px; font-weight: bold; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #888; }
          @media print { @page { margin: 15mm; } }
        </style></head><body>
        <h2>入库单</h2>
        <div style="font-size:13px;color:#555;">单号：<b style="color:#222">${this.order.orderNo}</b>
          &nbsp;&nbsp;状态：<b style="color:#222">${this.statusLabel(this.order.status)}</b></div>
        <div class="meta">
          <span>仓库<b>${this.warehouseName}</b></span>
          <span>入库类型<b>${typeMap[this.order.type] || this.order.type || '—'}</b></span>
          <span>创建时间<b>${this.order.createTime || '—'}</b></span>
          <span>确认时间<b>${this.order.confirmTime || '—'}</b></span>
        </div>
        <table>
          <thead><tr><th>商品</th><th style="text-align:center">计划数量${boxSuffix}</th><th style="text-align:center">实际数量${boxSuffix}</th><th style="text-align:right">单价</th><th style="text-align:right">重量</th><th style="text-align:right">小计</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">${this.qtyIsBox ? '总箱数：' + totals.boxes + ' 箱&nbsp;&nbsp;' : ''}总件数：${totals.pieces != null ? totals.pieces + ' 个' : '—'}&nbsp;&nbsp;总重量：${totals.weight != null ? totals.weight.toFixed(1) + ' kg' : '—'}&nbsp;&nbsp;合计金额：KSh ${totals.amount.toFixed(2)}</div>
        <div class="footer">
          <span>备注：${this.order.remark || '无'}</span>
          <span>打印时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Africa/Nairobi' })}</span>
        </div>
        <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`
      const w = window.open('', '_blank', 'width=800,height=600')
      w.document.write(html)
      w.document.close()
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