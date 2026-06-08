<template>
  <el-card>
    <div slot="header" style="font-weight:600;">系统参数配置</div>
    <el-table :data="configs" v-loading="loading" border stripe style="max-width:700px;">
      <el-table-column prop="key" label="配置键" width="240" />
      <el-table-column prop="remark" label="说明" min-width="160" />
      <el-table-column label="当前值" width="160">
        <template slot-scope="{row}">
          <span v-if="editing !== row.key">{{ row.value }}</span>
          <el-input v-else v-model="editValue" size="small" style="width:110px;" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" align="center">
        <template slot-scope="{row}">
          <template v-if="editing !== row.key">
            <el-button size="mini" type="primary" @click="startEdit(row)">编辑</el-button>
          </template>
          <template v-else>
            <el-button size="mini" type="success" :loading="saving" @click="saveEdit(row)">保存</el-button>
            <el-button size="mini" @click="editing = null">取消</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import { getSysConfigs, updateSysConfig } from '../../api/sysConfig'

export default {
  data() {
    return {
      configs: [],
      loading: false,
      editing: null,
      editValue: '',
      saving: false
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    loadData() {
      this.loading = true
      getSysConfigs()
        .then(r => { this.configs = r.data })
        .finally(() => { this.loading = false })
    },
    startEdit(row) {
      this.editing = row.key
      this.editValue = row.value
    },
    async saveEdit(row) {
      const val = this.editValue.trim()
      if (!val) { this.$message.warning('值不能为空'); return }
      if (isNaN(Number(val))) { this.$message.warning('请输入有效数字'); return }
      this.saving = true
      try {
        await updateSysConfig(row.key, val)
        row.value = val
        this.editing = null
        this.$message.success('保存成功')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>