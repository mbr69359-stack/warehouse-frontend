<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>退换货管理</span>
      <el-button type="primary" icon="el-icon-plus" @click="openCreate">新建退换货</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="returnNo" label="换货单号" width="180" show-overflow-tooltip />
      <el-table-column prop="warehouseName" label="仓库名" width="140" />
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{row}">
          <el-tag :type="row.status === 'COMPLETED' ? 'success' : 'info'">
            {{ row.status === 'COMPLETED' ? '已完成' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="100" align="center">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" plain @click="openDetail(row)">查看明细</el-button>
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
    <el-dialog :title="'退换货明细 — ' + (currentReturn && currentReturn.returnNo)"
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
        <el-button @click="detailVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getCustomerReturns, createCustomerReturn, getCustomerReturnItems } from '../../api/customerReturn'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'

export default {
  name: 'CustomerReturnIndex',
  data() {
    return {
      list: [], loading: false, total: 0,
      query: { current: 1, size: 20 },
      warehouses: [],
      createVisible: false,
      saving: false,
      createForm: { warehouseId: null, items: [] },
      createRules: {
        warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }]
      },
      products: [], productLoading: false,
      detailVisible: false,
      detailLoading: false,
      detailItems: [],
      currentReturn: null
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    this.loadData()
  },
  methods: {
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
        const emptyItem = this.createForm.items.find(i => !i.productId)
        if (emptyItem) {
          this.$message.warning('存在未选择商品的明细行，请补充或删除')
          return
        }
        this.saving = true
        try {
          await createCustomerReturn(this.createForm)
          this.$message.success('退换货单创建成功')
          this.createVisible = false
          this.loadData()
        } finally {
          this.saving = false
        }
      })
    },
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
