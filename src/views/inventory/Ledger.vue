<template>
  <el-card>
    <div slot="header">库存流水查询</div>
    <div style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
      <el-select v-model="query.type" placeholder="流水类型" clearable style="width:150px;" @change="search">
        <el-option label="入库" value="inbound" />
        <el-option label="出库" value="outbound" />
        <el-option label="调整" value="adjust" />
        <el-option label="调拨" value="transfer" />
        <el-option label="调拨入" value="transfer_in" />
        <el-option label="期初" value="opening" />
        <el-option label="入库撤销" value="inbound_cancel" />
        <el-option label="出库撤销" value="outbound_cancel" />
        <el-option label="调拨撤销" value="transfer_cancel" />
        <el-option label="损坏出库" value="damage_out" />
        <el-option label="补发出库" value="replacement_out" />
      </el-select>
      <el-select v-model="query.locationId" placeholder="仓库" clearable style="width:150px;" @change="search">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="yyyy-MM-dd"
        style="width:260px;"
        @change="search" />
      <el-button type="primary" icon="el-icon-search" @click="search">搜索</el-button>
      <el-button icon="el-icon-refresh" @click="reset">重置</el-button>
      <el-button type="success" icon="el-icon-download" :loading="exporting" @click="handleExport">导出 Excel</el-button>
      <el-button v-if="isAdmin" type="warning" icon="el-icon-refresh-left" :loading="rebuilding" @click="handleRebuild">重算快照</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="流水ID" width="80">
        <template slot-scope="{row}"><span :title="row.id">{{ row.id.slice(0,8) }}…</span></template>
      </el-table-column>
      <el-table-column prop="productId" label="商品ID" width="90" />
      <el-table-column prop="productName" label="商品名称" width="160" show-overflow-tooltip />
      <el-table-column label="仓库" width="120">
        <template slot-scope="{row}">{{ warehouseName(row.locationId) }}</template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="110">
        <template slot-scope="{row}"><el-tag :type="typeColor(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="changeQty" label="变动数量" width="100">
        <template slot-scope="{row}">
          <span :style="{ color: row.changeQty > 0 ? '#67C23A' : '#F56C6C' }">
            {{ row.changeQty > 0 ? '+' : '' }}{{ row.changeQty }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="documentNo" label="关联单号" width="160" show-overflow-tooltip />
      <el-table-column prop="operator" label="操作人" width="100" />
      <el-table-column prop="note" label="备注" show-overflow-tooltip />
      <el-table-column prop="occurredAt" label="发生时间" width="170" />
    </el-table>
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, sizes, prev, pager, next"
      :total="total" :page-size="query.size" :current-page="query.current"
      @current-change="p => { query.current = p; loadData() }"
      @size-change="s => { query.size = s; loadData() }" />
  </el-card>
</template>

<script>
import { getLedger, rebuildSnapshot, exportLedger } from '../../api/ledger'
import { getWarehouses } from '../../api/warehouse'

const TYPE_MAP = {
  inbound: { label: '入库', color: 'success' },
  outbound: { label: '出库', color: 'danger' },
  adjust: { label: '调整', color: 'warning' },
  transfer: { label: '调拨出', color: 'info' },
  transfer_in: { label: '调拨入', color: 'success' },
  opening: { label: '期初', color: '' },
  inbound_cancel: { label: '入库撤销', color: 'danger' },
  outbound_cancel: { label: '出库撤销', color: 'warning' },
  transfer_cancel: { label: '调拨撤销', color: 'info' },
  damage_out: { label: '损坏出库', color: 'warning' },
  replacement_out: { label: '补发出库', color: 'danger' }
}

export default {
  computed: {
    isAdmin() { return this.$store.getters.isAdmin }
  },
  data() {
    return {
      list: [], total: 0, loading: false, rebuilding: false, exporting: false,
      warehouses: [], dateRange: null,
      query: { current: 1, size: 20, type: null, locationId: null, startDate: null, endDate: null }
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = Array.isArray(r.data) ? r.data : (r.data.records || []) })
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      const params = { ...this.query }
      if (!params.type) delete params.type
      if (!params.locationId) delete params.locationId
      if (!params.startDate) delete params.startDate
      if (!params.endDate) delete params.endDate
      try {
        const res = await getLedger(params)
        this.list = res.data.records
        this.total = res.data.total
      } finally {
        this.loading = false
      }
    },
    search() {
      this.query.startDate = this.dateRange ? this.dateRange[0] : null
      this.query.endDate   = this.dateRange ? this.dateRange[1] : null
      this.query.current = 1
      this.loadData()
    },
    reset() {
      this.dateRange = null
      this.query = { current: 1, size: 20, type: null, locationId: null, startDate: null, endDate: null }
      this.loadData()
    },
    async handleExport() {
      this.exporting = true
      try {
        const params = {}
        if (this.query.type)       params.type       = this.query.type
        if (this.query.locationId) params.locationId = this.query.locationId
        if (this.query.startDate)  params.startDate  = this.query.startDate
        if (this.query.endDate)    params.endDate    = this.query.endDate
        const res = await exportLedger(params)
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = '库存台账_' + new Date().toISOString().slice(0, 10) + '.xlsx'
        a.click()
        window.URL.revokeObjectURL(url)
      } catch {
        this.$message.error('导出失败，请稍后重试')
      } finally {
        this.exporting = false
      }
    },
    typeLabel(t) { return TYPE_MAP[t] ? TYPE_MAP[t].label : t },
    typeColor(t) { return TYPE_MAP[t] ? TYPE_MAP[t].color : '' },
    async handleRebuild() {
      await this.$confirm('将从流水重算所有快照，确认执行？', '提示', { type: 'warning' })
      this.rebuilding = true
      try {
        await rebuildSnapshot()
        this.$message.success('快照重算完成')
        this.loadData()
      } finally {
        this.rebuilding = false
      }
    },
    warehouseName(id) {
      if (!id || id === 0) return '全局'
      const w = this.warehouses.find(w => w.id === id)
      return w ? w.name : id
    }
  }
}
</script>