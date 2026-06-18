<template>
  <el-card>
    <!-- 搜索栏和操作按钮 -->
    <div style="margin-bottom:16px;display:flex;gap:12px;">
      <el-input v-model="query.name" placeholder="客户名称" clearable style="width:200px;" @clear="loadData" />
      <el-button type="primary" icon="el-icon-search" @click="loadData">搜索</el-button>
      <el-button type="success" icon="el-icon-plus" @click="openForm()">新增客户</el-button>
    </div>

    <!-- 客户列表表格 -->
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="客户名称" />
      <el-table-column prop="contact" label="联系人" width="100" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="address" label="地址" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="90">
        <template slot-scope="{row}">
          <el-tag :type="row.status===1?'success':'info'">{{ row.status===1?'合作中':'已停止' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template slot-scope="{row}">
          <el-button size="mini" @click="$router.push('/customers/'+row.id)">详情</el-button>
          <el-button size="mini" type="primary" @click="openForm(row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
      :total="total" :page-size="query.size" :current-page="query.current"
      @current-change="p=>{query.current=p;loadData()}" />

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="form.id?'编辑客户':'新增客户'" :visible.sync="dialogVisible" width="500px">
      <el-form :model="form" :rules="rules" ref="form" label-width="80px">
        <el-form-item label="客户名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contact" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">合作中</el-radio>
            <el-radio :label="0">已停止</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../api/customer'
import crudList from '../../mixins/crudList'

export default {
  mixins: [crudList],
  data() {
    return {
      list: [],
      total: 0,
      loading: false,
      dialogVisible: false,
      deleteConfirmText: '确认删除该客户？',
      // 分页查询参数
      query: { current: 1, size: 100, name: '' },
      // 表单数据
      form: { id: null, name: '', contact: '', phone: '', address: '', remark: '', status: 1 },
      rules: {
        name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    // 加载客户列表
    async loadData() {
      this.loading = true
      try {
        const r = await getCustomers(this.query)
        this.list = r.data.records
        this.total = r.data.total
      } finally {
        this.loading = false
      }
    },
    // 空表单工厂（供 crudList mixin 的 openForm 使用）
    emptyForm() {
      return { id: null, name: '', contact: '', phone: '', address: '', remark: '', status: 1 }
    },
    createItem: createCustomer,
    updateItem: updateCustomer,
    deleteItem: deleteCustomer
  }
}
</script>