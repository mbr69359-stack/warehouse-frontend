<template>
  <div>
    <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
      <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">fact_check</span>
      <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">库存对账</p>
      <p style="font-size:13px;color:#757684;">请在电脑端查看</p>
    </div>
    <el-card v-else v-loading="loading">
      <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:600;">库存对账自检</span>
        <el-button icon="el-icon-refresh" @click="loadData">刷新</el-button>
        <el-button type="warning" icon="el-icon-refresh-right" :disabled="badCount === 0"
          :loading="rebuilding" @click="handleRebuild">按流水重算快照</el-button>
        <span style="color:#999;font-size:12px;">共 {{ tableData.length }} 条</span>
      </div>

      <div v-if="tableData.length" style="margin-bottom:12px;font-size:14px;">
        <span v-if="badCount === 0" style="color:#67C23A;font-weight:600;">✓ 账实一致</span>
        <template v-else>
          一致 <span style="color:#67C23A;font-weight:600;">{{ okCount }}</span> 条 /
          不一致 <span style="color:#F56C6C;font-weight:600;">{{ badCount }}</span> 条
        </template>
      </div>

      <el-table :data="sortedData" border stripe size="small" :row-style="rowStyle">
        <el-table-column prop="productName" label="商品名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="skuCode" label="SKU" width="130" />
        <el-table-column prop="warehouseName" label="仓库" width="120" />
        <el-table-column prop="ledgerSum" label="流水合计" width="100" align="right" />
        <el-table-column prop="currentQty" label="快照库存" width="100" align="right" />
        <el-table-column label="差异" width="90" align="right">
          <template slot-scope="{row}">
            <span :style="row.diff !== 0 ? 'font-weight:600;' : ''">{{ row.diff }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { getInventoryAudit, rebuildInventoryAudit } from '../../api/inventory'
import mobileMixin from '../../mixins/mobile'

export default {
  mixins: [mobileMixin],
  data() {
    return {
      tableData: [],
      loading: false,
      rebuilding: false
    }
  },
  computed: {
    badCount() {
      return this.tableData.filter(r => Number(r.diff) !== 0).length
    },
    okCount() {
      return this.tableData.length - this.badCount
    },
    // 不一致行置顶
    sortedData() {
      return [...this.tableData].sort((a, b) => (Number(b.diff) !== 0) - (Number(a.diff) !== 0))
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    rowStyle({ row }) {
      return Number(row.diff) !== 0 ? { color: '#F56C6C' } : {}
    },
    async loadData() {
      this.loading = true
      try {
        const res = await getInventoryAudit()
        this.tableData = res.data || []
      } catch (e) {
        this.$message.error('加载失败，请重试')
      } finally {
        this.loading = false
      }
    },
    handleRebuild() {
      this.$confirm(
        `检测到 ${this.badCount} 条账实不一致记录，重算将以流水合计覆盖快照库存，是否继续？`,
        '按流水重算快照',
        { confirmButtonText: '确定重算', cancelButtonText: '取消', type: 'warning' }
      ).then(async () => {
        this.rebuilding = true
        try {
          await rebuildInventoryAudit()
          this.$message.success('重算完成')
          await this.loadData()
        } finally {
          this.rebuilding = false
        }
      }).catch(() => {})
    }
  }
}
</script>
