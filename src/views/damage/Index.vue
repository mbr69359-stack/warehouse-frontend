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
      <el-button type="success" icon="el-icon-plus" style="margin-left:auto;" @click="openCreate">新建损坏记录</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="warehouseName" label="仓库" min-width="100" />
      <el-table-column label="商品" min-width="160">
        <template slot-scope="{row}">
          {{ row.productName }}<span style="color:#909399; margin-left:6px;">({{ row.skuCode }})</span>
        </template>
      </el-table-column>
      <el-table-column prop="qty" label="损坏数量" width="100" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{row}">
          <el-tag :type="row.status === 'PENDING' ? 'warning' : 'success'">
            {{ row.status === 'PENDING' ? '待处理' : '已核销' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="登记时间" width="160" />
      <el-table-column label="操作" width="90" align="center">
        <template slot-scope="{row}">
          <el-button v-if="row.status === 'PENDING'" size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
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
        <el-form-item label="数量" prop="qty">
          <el-input-number v-model="form.qty" :min="1" style="width:100%;" />
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
  </el-card>
</template>

<script>
import { getDamageRecords, createDamageRecord, deleteDamageRecord } from '../../api/damageRecord'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'

export default {
  name: 'DamageIndex',
  data() {
    return {
      list: [],
      loading: false,
      total: 0,
      query: { current: 1, size: 20, status: '', warehouseId: null },
      warehouses: [],
      dialogVisible: false,
      saving: false,
      form: { warehouseId: null, productId: null, qty: 1, remark: '' },
      products: [],
      productLoading: false,
      rules: {
        warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
        productId:   [{ required: true, message: '请选择商品', trigger: 'change' }],
        qty:         [{ required: true, message: '请输入数量', trigger: 'blur' }]
      }
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    this.loadData()
  },
  methods: {
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
      this.form = { warehouseId: null, productId: null, qty: 1, remark: '' }
      this.products = []
      this.dialogVisible = true
    },
    resetForm() {
      this.$refs.form && this.$refs.form.clearValidate()
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
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        await createDamageRecord(this.form).finally(() => { this.saving = false })
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
    }
  }
}
</script>
