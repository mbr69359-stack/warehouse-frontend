<template>
  <el-card>
    <div style="margin-bottom:16px;display:flex;gap:12px;">
      <el-input v-model="query.name" placeholder="供应商名称" clearable style="width:200px;" @clear="loadData" />
      <el-button type="primary" icon="el-icon-search" @click="loadData">搜索</el-button>
      <el-button type="success" icon="el-icon-plus" @click="openForm()">新增供应商</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="供应商名称" />
      <el-table-column prop="contact" label="联系人" width="100" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="status" label="状态" width="90">
        <template slot-scope="{row}"><el-tag :type="row.status===1?'success':'info'">{{ row.status===1?'合作中':'已停止' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" @click="openForm(row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
      :total="total" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />
    <el-dialog :title="form.id?'编辑供应商':'新增供应商'" :visible.sync="dialogVisible" width="500px">
      <el-form :model="form" :rules="rules" ref="form" label-width="90px">
        <el-form-item label="供应商名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contact" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status"><el-radio :label="1">合作中</el-radio><el-radio :label="0">已停止</el-radio></el-radio-group>
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
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../api/supplier'
export default {
  data() {
    return { list: [], total: 0, loading: false, dialogVisible: false,
      query: { current: 1, size: 10, name: '' },
      form: { id: null, name: '', contact: '', phone: '', email: '', address: '', status: 1 },
      rules: { name: [{ required: true, message: '请输入供应商名称' }] } }
  },
  created() { this.loadData() },
  methods: {
    async loadData() { this.loading = true; const r = await getSuppliers(this.query).finally(() => { this.loading = false }); this.list = r.data.records; this.total = r.data.total },
    openForm(row) { this.form = row ? { ...row } : { id: null, name: '', contact: '', phone: '', email: '', address: '', status: 1 }; this.dialogVisible = true },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.id) await updateSupplier(this.form.id, this.form)
        else await createSupplier(this.form)
        this.$message.success('保存成功'); this.dialogVisible = false; this.loadData()
      })
    },
    async handleDelete(id) { await this.$confirm('确认删除？', '提示', { type: 'warning' }); await deleteSupplier(id); this.$message.success('删除成功'); this.loadData() }
  }
}
</script>
