// 列表页通用增删改：打开新增/编辑弹窗、保存、删除。
// 组件需提供：
//   data:    form、dialogVisible（以及各自的 list/loading 等）
//   methods: emptyForm() 返回空表单、createItem(payload)、updateItem(id, payload)、
//            deleteItem(id)、loadData()
// 可选：deleteConfirmText 自定义删除确认文案（默认「确认删除？」）。
export default {
  methods: {
    openForm(row) {
      this.form = row ? { ...row } : this.emptyForm()
      this.dialogVisible = true
    },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.id) await this.updateItem(this.form.id, this.form)
        else await this.createItem(this.form)
        this.$message.success('保存成功')
        this.dialogVisible = false
        this.loadData()
      })
    },
    async handleDelete(id) {
      await this.$confirm(this.deleteConfirmText || '确认删除？', '提示', { type: 'warning' })
      await this.deleteItem(id)
      this.$message.success('删除成功')
      this.loadData()
    }
  }
}
