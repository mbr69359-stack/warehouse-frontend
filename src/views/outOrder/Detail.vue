<template>
  <el-card v-loading="loading">
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>出库单详情 — {{ order.orderNo }}</span>
      <el-tag v-if="order.status" :type="order.status==='CONFIRMED'?'success':'warning'" style="margin-left:8px;">
        {{ order.status==='CONFIRMED'?'已确认':'草稿' }}
      </el-tag>
    </div>
    <el-descriptions :column="3" border style="margin-bottom:16px;">
      <el-descriptions-item label="仓库">{{ warehouseName }}</el-descriptions-item>
      <el-descriptions-item label="出库类型">{{ typeLabel(order.type) }}</el-descriptions-item>
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
      <el-table-column prop="qty" label="计划数量" width="110" />
      <el-table-column prop="actualQty" label="实际数量" width="110" />
      <el-table-column label="单价" width="100"><template slot-scope="{row}">¥{{ row.price }}</template></el-table-column>
      <el-table-column label="小计">
        <template slot-scope="{row}">
          ¥{{ subtotal(row) }}
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:16px;display:flex;gap:10px;">
      <el-button v-if="order.status==='DRAFT'" type="danger" @click="openConfirmDialog">确认出库</el-button>
      <el-button icon="el-icon-printer" @click="printOrder">打印单据</el-button>
    </div>

    <!-- 确认出库弹窗 -->
    <el-dialog title="填写实际出库数量" :visible.sync="dialogVisible" width="560px" :close-on-click-modal="false">
      <el-table :data="confirmItems" border>
        <el-table-column label="商品" min-width="160">
          <template slot-scope="{row}">
            {{ row.productName || row.productId }}
          </template>
        </el-table-column>
        <el-table-column prop="planQty" label="计划数量" width="110" />
        <el-table-column label="实际出库数量">
          <template slot-scope="{row}">
            <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:140px;" />
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="danger" :loading="confirming" @click="submitConfirm">确认实际数量</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getOutOrder, confirmOutOrder, getOutOrderItems } from '../../api/outOrder'
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
    typeLabel(type) {
      const map = { SALE: '销售出库', TRANSFER: '调拨出库', DAMAGE_OUT: '损坏出库', REPLACEMENT_OUT: '补发出库' }
      return map[type] || type || '—'
    },
    subtotal(row) {
      const qty = this.order.status === 'CONFIRMED' ? (row.actualQty || 0) : (row.qty || 0)
      return (Math.round(qty * Number(row.price || 0) * 100) / 100).toFixed(2)
    },
    async loadData() {
      this.loading = true
      const id = this.$route.params.id
      try {
        const [orderRes, itemRes, warehouseRes] = await Promise.all([
          getOutOrder(id),
          getOutOrderItems(id),
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
        id: i.id, productId: i.productId, productName: i.productName,
        planQty: i.qty, actualQty: i.qty || 0
      }))
      this.dialogVisible = true
    },
    printOrder() {
      const typeMap = { SALE: '销售出库', TRANSFER: '调拨出库', DAMAGE_OUT: '损坏出库', REPLACEMENT_OUT: '补发出库' }
      const total = this.items.reduce((s, r) => {
        const qty = this.order.status === 'CONFIRMED' ? (r.actualQty || 0) : (r.qty || 0)
        return s + qty * Number(r.price || 0)
      }, 0)
      const rows = this.items.map(r => {
        const qty = this.order.status === 'CONFIRMED' ? (r.actualQty || 0) : (r.qty || 0)
        const sub = (qty * Number(r.price || 0)).toFixed(2)
        return `<tr>
          <td>${r.productName || r.productId}${r.skuCode ? '<br><small style="color:#888">' + r.skuCode + '</small>' : ''}</td>
          <td style="text-align:center">${r.qty}</td>
          <td style="text-align:center">${r.actualQty ?? '—'}</td>
          <td style="text-align:right">¥${Number(r.price || 0).toFixed(2)}</td>
          <td style="text-align:right">¥${sub}</td>
        </tr>`
      }).join('')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>出库单 ${this.order.orderNo}</title>
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
        <h2>出库单</h2>
        <div style="font-size:13px;color:#555;">单号：<b style="color:#222">${this.order.orderNo}</b>
          &nbsp;&nbsp;状态：<b style="color:#222">${this.order.status === 'CONFIRMED' ? '已确认' : '草稿'}</b></div>
        <div class="meta">
          <span>仓库<b>${this.warehouseName}</b></span>
          <span>出库类型<b>${typeMap[this.order.type] || this.order.type || '—'}</b></span>
          <span>创建时间<b>${this.order.createTime || '—'}</b></span>
          <span>确认时间<b>${this.order.confirmTime || '—'}</b></span>
        </div>
        <table>
          <thead><tr><th>商品</th><th style="text-align:center">计划数量</th><th style="text-align:center">实际数量</th><th style="text-align:right">单价</th><th style="text-align:right">小计</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">合计金额：¥${total.toFixed(2)}</div>
        <div class="footer">
          <span>备注：${this.order.remark || '无'}</span>
          <span>打印时间：${new Date().toLocaleString('zh-CN')}</span>
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
        await confirmOutOrder(this.$route.params.id, payload)
        this.$message.success('出库确认成功')
        this.dialogVisible = false
        this.loadData()
      } finally {
        this.confirming = false
      }
    }
  }
}
</script>
