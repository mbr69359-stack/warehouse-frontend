<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>待同步记录</span>
      <el-button
        v-if="online && pendingCount > 0"
        type="primary"
        size="small"
        :loading="syncing"
        @click="doSync"
      >立即同步 ({{ pendingCount }})</el-button>
    </div>

    <el-table :data="logs" v-loading="loading" border stripe>
      <el-table-column label="时间" width="170">
        <template slot-scope="{row}">{{ row.createdAt }}</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template slot-scope="{row}">
          <el-tag :type="row.type === 'IN' ? 'success' : 'danger'" size="mini">
            {{ row.type === 'IN' ? '入库' : '出库' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="仓库" width="120">
        <template slot-scope="{row}">{{ warehouseName(row.warehouseId) }}</template>
      </el-table-column>
      <el-table-column label="商品" min-width="160">
        <template slot-scope="{row}">{{ productName(row.productId) }}</template>
      </el-table-column>
      <el-table-column label="数量" width="90">
        <template slot-scope="{row}">{{ Math.abs(row.qty) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template slot-scope="{row}">
          <el-tag
            :type="row.status === 'SYNCED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'"
            size="mini"
          >{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="拒绝原因" min-width="180">
        <template slot-scope="{row}">
          <span style="color:#f56c6c;font-size:12px;">{{ row.rejectReason }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template slot-scope="{row}">
          <el-button
            v-if="row.status === 'REJECTED'"
            size="mini"
            type="warning"
            @click="retryLog(row)"
          >重试</el-button>
          <el-button
            v-if="row.status !== 'PENDING'"
            size="mini"
            type="danger"
            @click="removeLog(row.id)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import { getAllLogs, updateLogStatus, deleteLog } from '../../utils/db'
import { networkState, syncPendingLogs } from '../../utils/sync'

export default {
  data() {
    return {
      logs: [],
      loading: false,
      syncing: false,
      cachedProducts: [],
      cachedWarehouses: []
    }
  },
  computed: {
    online() { return networkState.online },
    pendingCount() { return networkState.pendingCount }
  },
  async created() {
    const { getCache } = await import('../../utils/db')
    const [p, w] = await Promise.all([getCache('products'), getCache('warehouses')])
    this.cachedProducts = p || []
    this.cachedWarehouses = w || []
    await this.loadLogs()
  },
  methods: {
    async loadLogs() {
      this.loading = true
      try { this.logs = await getAllLogs() }
      finally { this.loading = false }
    },
    statusLabel(s) {
      return { PENDING: '待同步', SYNCED: '已同步', REJECTED: '已拒绝' }[s] || s
    },
    productName(id) {
      const p = this.cachedProducts.find(x => x.id === id)
      return p ? p.name : `ID:${id}`
    },
    warehouseName(id) {
      const w = this.cachedWarehouses.find(x => x.id === id)
      return w ? w.name : `ID:${id}`
    },
    async retryLog(row) {
      await updateLogStatus(row.id, 'PENDING', undefined)
      row.status = 'PENDING'
      row.rejectReason = undefined
      networkState.pendingCount++
      if (this.online) await this.doSync()
    },
    async removeLog(id) {
      await deleteLog(id)
      this.logs = this.logs.filter(l => l.id !== id)
    },
    async doSync() {
      this.syncing = true
      try {
        const { synced, rejected } = await syncPendingLogs()
        this.$message({
          type: rejected > 0 ? 'warning' : 'success',
          message: `${synced} 条成功${rejected > 0 ? `，${rejected} 条失败` : ''}`
        })
        await this.loadLogs()
      } finally {
        this.syncing = false
      }
    }
  }
}
</script>