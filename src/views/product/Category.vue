<template>
  <el-card>
    <el-button type="success" icon="el-icon-plus" style="margin-bottom:16px;" @click="openForm()">新增分类</el-button>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="分类名称" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="操作" width="100">
        <template slot-scope="{row}"><el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button></template>
      </el-table-column>
    </el-table>
    <el-dialog title="新增分类" :visible.sync="dialogVisible" width="400px">
      <el-form :model="form" ref="form" label-width="80px">
        <el-form-item label="分类名称" prop="name" :rules="[{required:true,message:'请输入分类名称'}]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="父级分类">
          <el-select v-model="form.parentId" placeholder="顶级分类" clearable style="width:100%;">
            <el-option v-for="c in list" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" style="width:100%;" /></el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getCategories, createCategory, deleteCategory } from '../../api/category'
export default {
  data() { return { list: [], loading: false, dialogVisible: false, form: { name: '', parentId: null, sort: 0 } } },
  created() { this.loadData() },
  methods: {
    async loadData() { this.loading = true; const r = await getCategories().finally(() => { this.loading = false }); this.list = r.data },
    openForm() { this.form = { name: '', parentId: null, sort: 0 }; this.dialogVisible = true },
    async handleSave() { await createCategory(this.form); this.$message.success('创建成功'); this.dialogVisible = false; this.loadData() },
    async handleDelete(id) { await this.$confirm('确认删除？', '提示', { type: 'warning' }); await deleteCategory(id); this.$message.success('删除成功'); this.loadData() }
  }
}
</script>
