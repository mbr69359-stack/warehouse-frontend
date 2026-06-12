<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>退换货管理</span>
      <el-button type="primary" icon="el-icon-plus" @click="openCreate">新建退换货</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="exchangeNo" label="换货单号" width="180" show-overflow-tooltip />
      <el-table-column prop="warehouseName" label="仓库名" width="140" />
      <el-table-column label="状态" width="120" align="center">
        <template slot-scope="{row}">
          <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="300" align="center">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" plain @click="openDetail(row)">查看明细</el-button>
          <el-button v-if="row.status === 'DRAFT'" size="mini" type="danger" plain
            @click="handleDelete(row)">删除草稿</el-button>
          <!-- 步骤一：退货未入库 -->
          <el-button v-if="row.status === 'DRAFT'" size="mini" type="warning"
            @click="openInbound(row)">确认退货入库</el-button>
          <!-- 步骤二：已入库，待补发 -->
          <el-button v-if="row.status === 'INBOUND_DONE'" size="mini" type="success"
            @click="openConfirm(row)">确认补发出库</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination style="margin-top:16px;text-align:right;" background
      layout="total, prev, pager, next"
      :total="total" :page-size="query.size" :current-page.sync="query.current"
      @current-change="loadData" />

    <!-- 新建退换货弹窗 -->
    <el-dialog title="新建退换货" :visible.sync="createVisible" width="640px" @close="resetCreateForm">
      <el-form :model="createForm" :rules="createRules" ref="createForm" label-width="80px">
        <el-form-item label="仓库" prop="warehouseId">
          <el-select v-model="createForm.warehouseId" placeholder="请选择仓库" style="width:100%;">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <div style="margin:12px 0 8px;font-weight:bold;">退换商品明细</div>
      <el-button type="primary" size="small" icon="el-icon-plus" @click="addCreateItem" style="margin-bottom:10px;">
        添加商品
      </el-button>
      <el-table :data="createForm.items" border size="small">
        <el-table-column label="商品" min-width="220">
          <template slot-scope="{row}">
            <el-select v-model="row.productId" placeholder="输入名称搜索" filterable remote
              :remote-method="searchProducts" :loading="productLoading" style="width:100%;">
              <el-option v-for="p in products" :key="p.id"
                :label="p.name + '(' + p.skuCode + ')'" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="120">
          <template slot-scope="{row}">
            <el-input-number v-model="row.qty" :min="1" size="small" style="width:100%;" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60" align="center">
          <template slot-scope="{$index}">
            <el-button type="danger" size="mini" icon="el-icon-delete" circle
              @click="createForm.items.splice($index, 1)" />
          </template>
        </el-table-column>
      </el-table>

      <div slot="footer">
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">提交</el-button>
      </div>
    </el-dialog>

    <!-- 查看明细弹窗 -->
    <el-dialog :title="'退换货明细 — ' + (currentReturn && currentReturn.exchangeNo)"
      :visible.sync="detailVisible" width="680px">
      <el-table :data="detailItems" v-loading="detailLoading" border size="small">
        <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="skuCode" label="SKU" width="120" />
        <el-table-column prop="qty" label="数量" width="80" align="center" />
      </el-table>

      <div v-if="currentReturn && currentReturn.outOrderNo" style="margin-top:14px;color:#606266;">
        关联补发出库单：
        <el-button type="text" @click="goOutOrder(currentReturn.outOrderNo, currentReturn.outOrderId)">
          {{ currentReturn.outOrderNo }}
        </el-button>
      </div>

      <div slot="footer">
        <el-button v-if="currentReturn && currentReturn.status === 'DRAFT'" type="warning"
          @click="openInboundFromDetail">确认退货入库</el-button>
        <el-button v-if="currentReturn && currentReturn.status === 'INBOUND_DONE'" type="success"
          @click="openConfirmFromDetail">确认补发出库</el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 步骤一：确认退货入库弹窗 -->
    <el-dialog title="步骤一：确认退货入库 — 填写实际收货数量" :visible.sync="inboundVisible"
      width="580px" :close-on-click-modal="false">
      <el-alert type="info" :closable="false" style="margin-bottom:14px;"
        title="货物入库后系统自动生成损坏记录，完成后才可进行补发出库。" />
      <el-table :data="inboundItems" v-loading="inboundLoading" border size="small">
        <el-table-column label="商品" min-width="180">
          <template slot-scope="{row}">
            {{ row.productName || row.productId }}
            <span v-if="row.skuCode" style="color:#909399;font-size:12px;"> ({{ row.skuCode }})</span>
          </template>
        </el-table-column>
        <el-table-column prop="planQty" label="计划退回" width="90" align="center" />
        <el-table-column label="实际收货" width="140">
          <template slot-scope="{row}">
            <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:110px;" />
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer">
        <el-button @click="inboundVisible = false">取消</el-button>
        <el-button type="warning" :loading="inbounding" @click="submitInbound">确认入库</el-button>
      </div>
    </el-dialog>

    <!-- 步骤二：确认补发出库弹窗 -->
    <el-dialog title="步骤二：确认补发出库 — 填写实际发货数量" :visible.sync="confirmVisible"
      width="680px" :close-on-click-modal="false">
      <el-table :data="confirmItems" v-loading="confirmLoading" border size="small">
        <el-table-column label="商品" min-width="180">
          <template slot-scope="{row}">
            {{ row.productName || row.productId }}
            <span v-if="row.skuCode" style="color:#909399;font-size:12px;"> ({{ row.skuCode }})</span>
          </template>
        </el-table-column>
        <el-table-column prop="planQty" label="计划补发" width="90" align="center" />
        <el-table-column label="当前库存" width="100" align="center">
          <template slot-scope="{row}">
            <span :style="row.currentStock !== null && row.currentStock < row.actualQty ? 'color:#F56C6C;font-weight:bold;' : 'color:#67C23A;'">
              {{ row.currentStock !== null ? row.currentStock : '—' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="实际发货" width="140">
          <template slot-scope="{row}">
            <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:110px;" />
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer">
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="success" :loading="confirming" @click="submitConfirm">确认出库</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import {
  getCustomerReturns,
  createCustomerReturn,
  getCustomerReturnItems,
  getCustomerReturnInOrderItems,
  confirmCustomerReturnInbound,
  confirmCustomerReturn,
  deleteCustomerReturn
} from '../../api/customerReturn'
import { getOutOrderItems } from '../../api/outOrder'
import { getInventory } from '../../api/inventory'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'

export default {
  name: 'CustomerReturnIndex',
  data() {
    return {
      list: [], loading: false, total: 0,
      query: { current: 1, size: 20 },
      warehouses: [],
      // 新建
      createVisible: false,
      saving: false,
      createForm: { warehouseId: null, items: [] },
      createRules: {
        warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }]
      },
      products: [], productLoading: false,
      // 查看明细
      detailVisible: false,
      detailLoading: false,
      detailItems: [],
      currentReturn: null,
      // 步骤一：退货入库
      inboundVisible: false,
      inboundLoading: false,
      inbounding: false,
      inboundItems: [],
      // 步骤二：补发出库
      confirmVisible: false,
      confirmLoading: false,
      confirming: false,
      confirmItems: []
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    this.loadData()
  },
  methods: {
    // 状态显示
    statusLabel(status) {
      return { DRAFT: '待退货入库', INBOUND_DONE: '待补发出库', COMPLETED: '已完成' }[status] || status
    },
    statusTagType(status) {
      return { DRAFT: 'warning', INBOUND_DONE: 'primary', COMPLETED: 'success' }[status] || 'info'
    },

    async loadData() {
      this.loading = true
      try {
        const r = await getCustomerReturns(this.query)
        this.list = r.data.records
        this.total = r.data.total
      } finally {
        this.loading = false
      }
    },
    async handleDelete(row) {
      try {
        await this.$confirm(
          `确认删除退换货草稿 ${row.exchangeNo}？关联的退货入库草稿和补发出库草稿也会一起删除。`,
          '删除确认',
          { type: 'warning' }
        )
      } catch {
        return
      }
      await deleteCustomerReturn(row.id)
      this.$message.success('草稿已删除')
      this.loadData()
    },

    // 新建
    openCreate() {
      this.createForm = { warehouseId: null, items: [] }
      this.products = []
      this.createVisible = true
    },
    resetCreateForm() {
      this.$refs.createForm && this.$refs.createForm.clearValidate()
    },
    addCreateItem() {
      this.createForm.items.push({ productId: null, qty: 1 })
    },
    searchProducts(query) {
      if (!query) return
      this.productLoading = true
      getProducts({ current: 1, size: 20, name: query })
        .then(r => {
          const incoming = r.data.records
          const seen = new Set(this.products.map(p => p.id))
          this.products = [...this.products, ...incoming.filter(p => !seen.has(p.id))]
        })
        .finally(() => { this.productLoading = false })
    },
    handleCreate() {
      this.$refs.createForm.validate(async valid => {
        if (!valid) return
        if (this.createForm.items.length === 0) {
          this.$message.warning('请至少添加一条退换商品')
          return
        }
        if (this.createForm.items.find(i => !i.productId)) {
          this.$message.warning('存在未选择商品的明细行，请补充或删除')
          return
        }
        this.saving = true
        try {
          await createCustomerReturn(this.createForm)
          this.$message.success('退换货单创建成功，请确认退货入库')
          this.createVisible = false
          this.loadData()
        } finally {
          this.saving = false
        }
      })
    },

    // 查看明细
    async openDetail(row) {
      this.currentReturn = row
      this.detailVisible = true
      this.detailLoading = true
      this.detailItems = []
      try {
        const r = await getCustomerReturnItems(row.id)
        this.detailItems = r.data || []
      } finally {
        this.detailLoading = false
      }
    },
    openInboundFromDetail() {
      this.detailVisible = false
      this.openInbound(this.currentReturn)
    },
    openConfirmFromDetail() {
      this.detailVisible = false
      this.openConfirm(this.currentReturn)
    },

    // 步骤一：退货入库
    async openInbound(row) {
      this.currentReturn = row
      this.inboundItems = []
      this.inboundVisible = true
      this.inboundLoading = true
      try {
        const r = await getCustomerReturnInOrderItems(row.id)
        this.inboundItems = (r.data || []).map(i => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          skuCode: i.skuCode,
          planQty: i.planQty,
          actualQty: i.planQty  // 默认填计划数量
        }))
      } catch {
        this.$message.error('加载退货明细失败，请重试')
        this.inboundVisible = false
      } finally {
        this.inboundLoading = false
      }
    },
    async submitInbound() {
      if (!this.inboundItems.some(i => (i.actualQty || 0) > 0)) {
        this.$message.warning('请至少填写一件商品的实际收货数量')
        return
      }
      this.inbounding = true
      try {
        const payload = this.inboundItems.map(i => ({ itemId: i.id, actualQty: i.actualQty || 0 }))
        await confirmCustomerReturnInbound(this.currentReturn.id, payload)
        this.inboundVisible = false
        this.loadData()
        const warehouseId = this.currentReturn.warehouseId
        this.$confirm('退货入库成功，已自动生成损坏记录。', '提示', {
          type: 'success',
          confirmButtonText: '查看损坏记录',
          cancelButtonText: '继续'
        }).then(() => {
          this.$router.push({ path: '/damage', query: { warehouseId } })
        }).catch(() => {})
      } finally {
        this.inbounding = false
      }
    },

    // 步骤二：补发出库
    async openConfirm(row) {
      this.currentReturn = row
      this.confirmItems = []
      this.confirmVisible = true
      this.confirmLoading = true
      try {
        const [itemsResp, invResp] = await Promise.all([
          getOutOrderItems(row.outOrderId),
          getInventory({ warehouseId: row.warehouseId, size: 200 })
        ])
        const invMap = {}
        for (const inv of (invResp.data.records || [])) {
          invMap[inv.productId] = inv.qty
        }
        this.confirmItems = (itemsResp.data || []).map(i => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          skuCode: i.skuCode,
          planQty: i.qty,
          actualQty: i.qty,
          currentStock: invMap[i.productId] !== undefined ? invMap[i.productId] : null
        }))
      } catch {
        this.$message.error('加载补发明细失败，请重试')
        this.confirmVisible = false
      } finally {
        this.confirmLoading = false
      }
    },
    async submitConfirm() {
      if (!this.confirmItems.some(i => (i.actualQty || 0) > 0)) {
        this.$message.warning('请至少填写一件商品的实际发货数量')
        return
      }
      this.confirming = true
      try {
        const payload = this.confirmItems.map(i => ({ itemId: i.id, actualQty: i.actualQty || 0 }))
        await confirmCustomerReturn(this.currentReturn.id, payload)
        this.$message.success('补发出库确认成功')
        this.confirmVisible = false
        this.loadData()
      } finally {
        this.confirming = false
      }
    },

    goOutOrder(no, id) {
      if (id) {
        this.$router.push(`/out-orders/${id}`)
      } else {
        this.$message.info(`出库单号：${no}`)
      }
    }
  }
}
</script>
