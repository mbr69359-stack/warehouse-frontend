<template>
  <el-card>
    <el-button type="success" icon="el-icon-plus" style="margin-bottom:16px;" @click="openForm()">新增仓库</el-button>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="仓库名称" />
      <el-table-column prop="address" label="地址" />
      <el-table-column prop="status" label="状态" width="80">
        <template slot-scope="{row}"><el-tag :type="row.status===1?'success':'info'">{{ row.status===1?'启用':'禁用' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" @click="openForm(row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog :title="form.id?'编辑仓库':'新增仓库'" :visible.sync="dialogVisible" width="460px">
      <el-form :model="form" :rules="rules" ref="form" label-width="90px">
        <el-form-item label="仓库名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
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
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../api/warehouse'
export default {
  data() {
    return { list: [], loading: false, dialogVisible: false,
      form: { id: null, name: '', address: '', remark: '', status: 1 },
      rules: { name: [{ required: true, message: '请输入仓库名称' }] } }
  },
  created() { this.loadData() },
  methods: {
    async loadData() { this.loading = true; const r = await getWarehouses().finally(() => { this.loading = false }); this.list = r.data },
    openForm(row) { this.form = row ? { ...row } : { id: null, name: '', address: '', remark: '', status: 1 }; this.dialogVisible = true },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.id) await updateWarehouse(this.form.id, this.form)
        else await createWarehouse(this.form)
        this.$message.success('保存成功'); this.dialogVisible = false; this.loadData()
      })
    },
    async handleDelete(id) { await this.$confirm('确认删除？', '提示', { type: 'warning' }); await deleteWarehouse(id); this.$message.success('删除成功'); this.loadData() }
  }
}
</script>
