<template>
  <el-card>
    <el-button type="success" icon="el-icon-plus" style="margin-bottom:16px;" @click="openForm()">新增角色</el-button>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="roleName" label="角色名称" width="150" />
      <el-table-column prop="roleCode" label="角色编码" width="150" />
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="160">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" @click="openForm(row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog :title="form.id?'编辑角色':'新增角色'" :visible.sync="dialogVisible" width="460px">
      <el-form :model="form" :rules="rules" ref="form" label-width="90px">
        <el-form-item label="角色名称" prop="roleName"><el-input v-model="form.roleName" /></el-form-item>
        <el-form-item label="角色编码" prop="roleCode"><el-input v-model="form.roleCode" :disabled="!!form.id" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getRoles, createRole, updateRole, deleteRole } from '../../api/sys'
export default {
  data() {
    return { list: [], loading: false, dialogVisible: false,
      form: { id: null, roleName: '', roleCode: '', remark: '' },
      rules: { roleName: [{ required: true, message: '请输入角色名称' }], roleCode: [{ required: true, message: '请输入角色编码' }] } }
  },
  created() { this.loadData() },
  methods: {
    async loadData() { this.loading = true; const r = await getRoles().finally(() => { this.loading = false }); this.list = r.data },
    openForm(row) { this.form = row ? { ...row } : { id: null, roleName: '', roleCode: '', remark: '' }; this.dialogVisible = true },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.id) await updateRole(this.form.id, this.form)
        else await createRole(this.form)
        this.$message.success('保存成功'); this.dialogVisible = false; this.loadData()
      })
    },
    async handleDelete(id) { await this.$confirm('确认删除该角色？', '提示', { type: 'warning' }); await deleteRole(id); this.$message.success('删除成功'); this.loadData() }
  }
}
</script>
