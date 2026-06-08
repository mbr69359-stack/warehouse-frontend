<template>
  <el-card>
    <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <span style="font-weight:600;">费用管理</span>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
        @change="loadData" style="width:240px;" />
      <el-select v-model="filterWarehouse" placeholder="全部仓库" clearable style="width:130px;" @change="loadData">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
      <el-select v-model="filterType" placeholder="全部类型" clearable style="width:120px;" @change="loadData">
        <el-option v-for="t in EXPENSE_TYPES" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-button type="primary" icon="el-icon-plus" @click="openAdd">新增费用</el-button>
    </div>

    <!-- 汇总卡片 -->
    <el-row :gutter="12" style="margin-bottom:16px;">
      <el-col :span="4" v-for="t in EXPENSE_TYPES" :key="t.value">
        <el-card shadow="never" style="text-align:center;padding:8px 0;">
          <div style="font-size:12px;color:#909399;">{{ t.label }}</div>
          <div style="font-size:18px;font-weight:700;color:#E6A23C;margin-top:2px;">
            KSh {{ fmt(typeTotal(t.value)) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="expenseDate" label="日期" width="120" sortable />
      <el-table-column label="仓库" width="120">
        <template slot-scope="{row}">{{ warehouseName(row.warehouseId) }}</template>
      </el-table-column>
      <el-table-column label="费用类型" width="110">
        <template slot-scope="{row}">
          <el-tag size="small" :type="typeTagColor(row.type)">{{ expenseTypeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额 (KSh)" align="right" width="140">
        <template slot-scope="{row}">
          <span style="font-weight:600;color:#E6A23C;">KSh {{ fmt(row.amount) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" show-overflow-tooltip />
      <el-table-column label="操作" width="130" align="center">
        <template slot-scope="{row}">
          <el-button size="mini" icon="el-icon-edit" @click="openEdit(row)">编辑</el-button>
          <el-button size="mini" type="danger" icon="el-icon-delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="420px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="form" label-width="90px">
        <el-form-item label="日期" prop="expenseDate">
          <el-date-picker v-model="form.expenseDate" type="date" value-format="yyyy-MM-dd"
            placeholder="选择日期" style="width:100%;" />
        </el-form-item>
        <el-form-item label="仓库" prop="warehouseId">
          <el-select v-model="form.warehouseId" placeholder="选择仓库" style="width:100%;">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="费用类型" prop="type">
          <el-select v-model="form.type" placeholder="选择类型" style="width:100%;">
            <el-option v-for="t in EXPENSE_TYPES" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额 (KSh)" prop="amount">
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width:100%;" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getExpenses, createExpense, updateExpense, deleteExpense, EXPENSE_TYPES, expenseTypeLabel } from '../../api/expense'
import { getWarehouses } from '../../api/warehouse'
import { todayKe, monthsAgoKe } from '../../utils/time'

const emptyForm = () => ({ expenseDate: '', warehouseId: null, type: '', amount: 0, note: '' })

export default {
  data() {
    return {
      loading: false,
      submitting: false,
      tableData: [],
      warehouses: [],
      dateRange: [monthsAgoKe(1), todayKe()],
      filterWarehouse: null,
      filterType: '',
      dialogVisible: false,
      editingId: null,
      form: emptyForm(),
      EXPENSE_TYPES,
      expenseTypeLabel,
      rules: {
        expenseDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
        warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
        type:        [{ required: true, message: '请选择费用类型', trigger: 'change' }],
        amount:      [{ required: true, type: 'number', min: 0.01, message: '金额须大于0', trigger: 'blur' }]
      }
    }
  },
  computed: {
    dialogTitle() { return this.editingId ? '编辑费用' : '新增费用' }
  },
  created() {
    this.loadWarehouses()
    this.loadData()
  },
  methods: {
    fmt(v) { return Number(v || 0).toFixed(2) },
    warehouseName(id) {
      return this.warehouses.find(w => w.id === id)?.name || id
    },
    typeTotal(type) {
      return this.tableData.filter(r => r.type === type).reduce((s, r) => s + Number(r.amount || 0), 0)
    },
    typeTagColor(type) {
      const map = { UNLOADING: '', DELIVERY: 'success', SALARY: 'warning', COMMISSION: 'danger', STORAGE: 'info', OTHER: '' }
      return map[type] || ''
    },
    async loadWarehouses() {
      const res = await getWarehouses().catch(() => ({ data: [] }))
      this.warehouses = (res.data || []).filter(w => w.status === 1)
    },
    async loadData() {
      this.loading = true
      try {
        const params = {}
        if (this.dateRange?.[0]) { params.startDate = this.dateRange[0]; params.endDate = this.dateRange[1] }
        if (this.filterWarehouse) params.warehouseId = this.filterWarehouse
        if (this.filterType) params.type = this.filterType
        const res = await getExpenses(params)
        this.tableData = res.data || []
      } finally {
        this.loading = false
      }
    },
    openAdd() {
      this.editingId = null
      this.form = emptyForm()
      this.dialogVisible = true
    },
    openEdit(row) {
      this.editingId = row.id
      this.form = { expenseDate: row.expenseDate, warehouseId: row.warehouseId, type: row.type, amount: Number(row.amount), note: row.note || '' }
      this.dialogVisible = true
    },
    resetForm() {
      this.$refs.form?.clearValidate()
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          if (this.editingId) {
            await updateExpense(this.editingId, this.form)
          } else {
            await createExpense(this.form)
          }
          this.$message.success('保存成功')
          this.dialogVisible = false
          this.loadData()
        } catch {
          this.$message.error('保存失败')
        } finally {
          this.submitting = false
        }
      })
    },
    handleDelete(row) {
      this.$confirm(`确认删除 ${expenseTypeLabel(row.type)} KSh ${this.fmt(row.amount)} 这条记录？`, '删除确认', {
        type: 'warning'
      }).then(async () => {
        await deleteExpense(row.id)
        this.$message.success('已删除')
        this.loadData()
      }).catch(() => {})
    }
  }
}
</script>