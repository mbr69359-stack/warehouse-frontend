<template>
  <el-card>
    <div style="margin-bottom:16px;display:flex;gap:12px;">
      <el-input v-model="query.username" placeholder="用户名" clearable style="width:200px;" @clear="loadData" />
      <el-button type="primary" icon="el-icon-search" @click="loadData">搜索</el-button>
      <el-button type="success" icon="el-icon-plus" @click="openForm()">新增用户</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="用户名" width="130" />
      <el-table-column prop="realName" label="真实姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="status" label="状态" width="80">
        <template slot-scope="{row}"><el-tag :type="row.status===1?'success':'danger'">{{ row.status===1?'启用':'禁用' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" @click="openForm(row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
      :total="total" :page-size="query.size" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />
    <el-dialog :title="form.id?'编辑用户':'新增用户'" :visible.sync="dialogVisible" width="500px">
      <el-form :model="form" :rules="rules" ref="form" label-width="90px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" :disabled="!!form.id" /></el-form-item>
        <el-form-item label="密码" :prop="form.id?'':'password'">
          <el-input v-model="form.password" type="password" :placeholder="form.id?'不填则不修改':'请输入密码'" />
        </el-form-item>
        <el-form-item label="真实姓名"><el-input v-model="form.realName" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleIds" multiple style="width:100%;">
            <el-option v-for="r in roles" :key="r.id" :label="r.roleName" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status"><el-radio :label="1">启用</el-radio><el-radio :label="0">禁用</el-radio></el-radio-group>
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
import { getUsers, createUser, updateUser, deleteUser, getRoles } from '../../api/sys'
export default {
  data() {
    return { list: [], total: 0, loading: false, dialogVisible: false, roles: [],
      query: { current: 1, size: 100, username: '' },
      form: { id: null, username: '', password: '', realName: '', phone: '', email: '', status: 1, roleIds: [] },
      rules: { username: [{ required: true, message: '请输入用户名' }], password: [{ required: true, message: '请输入密码' }] } }
  },
  created() { this.loadData(); getRoles().then(r => { this.roles = r.data }) },
  methods: {
    async loadData() { this.loading = true; const r = await getUsers(this.query).finally(() => { this.loading = false }); this.list = r.data.records; this.total = r.data.total },
    openForm(row) {
      this.form = row ? { ...row, password: '', roleIds: [] } : { id: null, username: '', password: '', realName: '', phone: '', email: '', status: 1, roleIds: [] }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.id) await updateUser(this.form.id, this.form)
        else await createUser(this.form)
        this.$message.success('保存成功'); this.dialogVisible = false; this.loadData()
      })
    },
    async handleDelete(id) { await this.$confirm('确认删除该用户？', '提示', { type: 'warning' }); await deleteUser(id); this.$message.success('删除成功'); this.loadData() }
  }
}
</script>
