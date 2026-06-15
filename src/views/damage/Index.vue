<template>
  <el-card>
    <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width:140px;" @change="loadData">
        <el-option label="全部" value="" />
        <el-option label="待处理" value="PENDING" />
        <el-option label="已核销" value="RESOLVED" />
      </el-select>
      <el-select v-model="query.warehouseId" placeholder="全部仓库" clearable style="width:160px;" @change="loadData">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
      <el-radio-group v-model="displayMode" size="small">
        <el-radio-button label="box">按箱</el-radio-button>
        <el-radio-button label="piece">按个</el-radio-button>
      </el-radio-group>
      <el-button type="success" icon="el-icon-plus" style="margin-left:auto;" @click="openCreate">新建损坏记录</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="warehouseName" label="仓库" min-width="100" />
      <el-table-column label="商品" min-width="160">
        <template slot-scope="{row}">
          {{ row.productName }}<span style="color:#909399; margin-left:6px;">({{ row.skuCode }})</span>
        </template>
      </el-table-column>
      <el-table-column label="破损数量" width="110" align="center">
        <template slot-scope="{row}">{{ fmtQty(row.qty, row.warehouseId, row.productId) }}</template>
      </el-table-column>
      <el-table-column label="成本核销" width="110" align="right">
        <template slot-scope="{row}">
          <span v-if="row.costDeduction != null" style="color:#F56C6C;">
            KSh {{ Number(row.costDeduction).toFixed(2) }}
          </span>
          <span v-else style="color:#C0C4CC;">—</span>
        </template>
      </el-table-column>
      <el-table-column label="好货调拨" width="110" align="center">
        <template slot-scope="{row}">
          <span v-if="row.goodQty != null">{{ fmtQty(row.goodQty, row.warehouseId, row.productId) }}</span>
          <span v-else style="color:#C0C4CC;">—</span>
        </template>
      </el-table-column>
      <el-table-column label="零售定价" width="100" align="right">
        <template slot-scope="{row}">
          <span v-if="row.transferPrice != null">KSh {{ Number(row.transferPrice).toFixed(2) }}</span>
          <span v-else style="color:#C0C4CC;">—</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{row}">
          <el-tag :type="row.status === 'PENDING' ? 'warning' : 'success'">
            {{ row.status === 'PENDING' ? '待处理' : '已核销' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
      <el-table-column label="登记时间" width="160">
        <template slot-scope="{row}">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" align="center">
        <template slot-scope="{row}">
          <template v-if="row.status === 'PENDING'">
            <el-button size="mini" type="primary" @click="openTransfer(row)">调拨</el-button>
            <el-button size="mini" type="warning" @click="handleWriteOff(row)">损坏出库</el-button>
            <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top:16px; text-align:right;"
      background
      layout="total, prev, pager, next"
      :total="total"
      :page-size="query.size"
      :current-page.sync="query.current"
      @current-change="loadData" />

    <!-- 新建损坏记录弹窗 -->
    <el-dialog title="新建损坏记录" :visible.sync="dialogVisible" width="460px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="form" label-width="80px">
        <el-form-item label="仓库" prop="warehouseId">
          <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width:100%;">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品" prop="productId">
          <el-select
            v-model="form.productId"
            placeholder="输入名称搜索"
            filterable
            remote
            :remote-method="searchProducts"
            :loading="productLoading"
            style="width:100%;">
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="p.name + '(' + p.skuCode + ')'"
              :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="登记单位" v-if="createBoxSelectable">
          <el-radio-group v-model="form.unit" size="small">
            <el-radio-button label="PIECE">按个</el-radio-button>
            <el-radio-button label="BOX">按箱</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数量" prop="qty">
          <el-input-number v-model="form.qty" :min="1" style="width:100%;" />
          <span v-if="createBoxSelectable && form.unit === 'BOX'"
            style="color:#909399;font-size:12px;margin-left:4px;">
            = {{ (form.qty || 0) * (createProduct.qtyPerBox || 0) }} 个
          </span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">提交</el-button>
      </div>
    </el-dialog>

    <!-- 调拨弹窗 -->
    <el-dialog title="调拨好货到零售仓" :visible.sync="transferVisible" width="480px" @close="resetTransfer">
      <div v-if="transferRow" style="margin-bottom:16px; padding:12px; background:#f5f7fa; border-radius:4px; font-size:14px; line-height:1.8;">
        <div>
          商品：<strong>{{ transferRow.productName }}</strong>（{{ transferRow.skuCode }}）
        </div>
        <div>破损数量：<span style="color:#F56C6C;">{{ transferRow.qty }} 个</span></div>
        <template v-if="transferRow.productQtyPerBox">
          <div>
            成本核销：<span style="color:#F56C6C;">
              KSh {{ (transferRow.qty * (transferRow.productCostPrice || 0)).toFixed(2) }}
            </span>
            （{{ transferRow.qty }} 个 × KSh {{ Number(transferRow.productCostPrice || 0).toFixed(2) }}）
          </div>
          <div>
            好货数量：<span style="color:#67C23A;">{{ transferRow.productQtyPerBox - transferRow.qty }} 个</span>
            （每箱 {{ transferRow.productQtyPerBox }} 个）
          </div>
        </template>
        <el-alert v-else type="warning" :closable="false" show-icon
          title="该商品未设每箱数量，无法调拨" style="margin-top:8px;" />
      </div>

      <el-form v-if="transferRow && transferRow.productQtyPerBox"
        :model="transferForm" :rules="transferRules" ref="transferForm" label-width="90px">
        <el-form-item label="目标仓库" prop="targetWarehouseId">
          <el-select v-model="transferForm.targetWarehouseId" placeholder="请选择按个仓库" style="width:100%;">
            <el-option
              v-for="w in pieceWarehouses"
              :key="w.id"
              :label="w.name"
              :value="w.id" />
          </el-select>
          <div v-if="pieceWarehouses.length === 0" style="color:#E6A23C; font-size:12px; margin-top:4px;">
            暂无按个仓库，请先在仓库管理中创建 PIECE 类型仓库
          </div>
        </el-form-item>
        <el-form-item label="零售定价" prop="transferPrice">
          <el-input-number
            v-model="transferForm.transferPrice"
            :min="0.01"
            :precision="2"
            style="width:100%;"
            placeholder="每个零售价" />
        </el-form-item>
      </el-form>

      <div slot="footer">
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button
          v-if="transferRow && transferRow.productQtyPerBox"
          type="primary"
          :loading="transferSaving"
          @click="handleTransfer">
          确认调拨
        </el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getDamageRecords, createDamageRecord, deleteDamageRecord, transferDamageRecord, writeOffDamageRecord } from '../../api/damageRecord'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import productSearch from '../../mixins/productSearch'
import { formatDateTime } from '../../utils/time'

export default {
  name: 'DamageIndex',
  mixins: [productSearch],
  computed: {
    displayMode: {
      get() { return this.$store.state.displayUnit },
      set(v) { this.$store.commit('SET_DISPLAY_UNIT', v) }
    },
    pieceWarehouses() {
      return this.warehouses.filter(w => w.type === 'PIECE')
    },
    createWarehouse() {
      return this.warehouses.find(w => w.id === this.form.warehouseId)
    },
    createProduct() {
      return this.products.find(p => p.id === this.form.productId) || this.allProductsMap[this.form.productId] || {}
    },
    createBoxSelectable() {
      return this.createWarehouse && this.createWarehouse.type === 'BOX' && this.createProduct.qtyPerBox > 0
    }
  },
  data() {
    return {
      list: [],
      loading: false,
      total: 0,
      query: { current: 1, size: 20, status: '', warehouseId: null },
      warehouses: [],
      allProductsMap: {},
      dialogVisible: false,
      saving: false,
      form: { warehouseId: null, productId: null, qty: 1, unit: 'PIECE', remark: '' },
      products: [],
      productLoading: false,
      rules: {
        warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
        productId:   [{ required: true, message: '请选择商品', trigger: 'change' }],
        qty:         [{ required: true, message: '请输入数量', trigger: 'blur' }]
      },
      // 调拨弹窗
      transferVisible: false,
      transferSaving: false,
      transferRow: null,
      transferForm: { targetWarehouseId: null, transferPrice: null },
      transferRules: {
        targetWarehouseId: [{ required: true, message: '请选择目标仓库', trigger: 'change' }],
        transferPrice:     [{ required: true, message: '请输入零售定价', trigger: 'blur' }]
      }
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data || [] })
    getProducts({ size: 1000 }).then(r => {
      const items = r.data.records || r.data || []
      this.allProductsMap = Object.fromEntries(items.map(p => [p.id, p]))
    })
    if (this.$route.query.warehouseId) {
      this.query.warehouseId = Number(this.$route.query.warehouseId)
    }
    this.loadData()
  },
  methods: {
    formatDateTime,
    fmtQty(qty, warehouseId, productId) {
      const wh = this.warehouses.find(w => w.id === warehouseId)
      const prod = this.allProductsMap[productId]
      const n = Number(qty) || 0
      const qtyPerBox = prod?.qtyPerBox
      if (this.displayMode === 'piece') return `${n} 个`
      if (wh?.type === 'PIECE') return `${n} 个`
      if (!qtyPerBox) return `${n} 个`
      const boxes = Math.floor(n / qtyPerBox)
      const loose = n % qtyPerBox
      return loose > 0 ? `${boxes}箱 ${loose}个` : `${boxes}箱`
    },
    async loadData() {
      this.loading = true
      const params = { current: this.query.current, size: this.query.size }
      if (this.query.status) params.status = this.query.status
      if (this.query.warehouseId) params.warehouseId = this.query.warehouseId
      const r = await getDamageRecords(params).finally(() => { this.loading = false })
      this.list = r.data.records
      this.total = r.data.total
    },
    openCreate() {
      this.form = { warehouseId: null, productId: null, qty: 1, unit: 'PIECE', remark: '' }
      this.products = []
      this.dialogVisible = true
    },
    resetForm() {
      this.$refs.form && this.$refs.form.clearValidate()
    },
    handleCreate() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        const payload = { ...this.form, unit: this.createBoxSelectable ? this.form.unit : 'PIECE' }
        await createDamageRecord(payload).finally(() => { this.saving = false })
        this.$message.success('创建成功')
        this.dialogVisible = false
        this.loadData()
      })
    },
    async handleDelete(id) {
      await this.$confirm('确认删除该损坏记录？', '提示', { type: 'warning' })
      await deleteDamageRecord(id)
      this.$message.success('删除成功')
      this.loadData()
    },
    openTransfer(row) {
      this.transferRow = row
      this.transferForm = { targetWarehouseId: null, transferPrice: null }
      this.transferVisible = true
    },
    resetTransfer() {
      this.$refs.transferForm && this.$refs.transferForm.clearValidate()
      this.transferRow = null
    },
    handleTransfer() {
      this.$refs.transferForm.validate(async valid => {
        if (!valid) return
        this.transferSaving = true
        try {
          await transferDamageRecord(this.transferRow.id, this.transferForm)
          this.$message.success('调拨成功')
          this.transferVisible = false
          this.loadData()
        } finally {
          this.transferSaving = false
        }
      })
    },
    async handleWriteOff(row) {
      const cost = Number(row.productCostPrice || 0)
      const loss = (row.qty * cost).toFixed(2)
      await this.$confirm(
        `确认将「${row.productName}」按损坏报废出库 ${this.fmtQty(row.qty, row.warehouseId, row.productId)}？损耗 KSh ${loss}，此操作不可撤销。`,
        '损坏出库', { type: 'warning' })
      await writeOffDamageRecord(row.id)
      this.$message.success('损坏出库成功')
      this.loadData()
    }
  }
}
</script>