<template>
  <el-card>
    <div slot="header">库存流水查询</div>
    <div style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
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
      </el-select>
      <el-select v-model="query.locationId" placeholder="仓库" clearable style="width:150px;" @change="search">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="search">搜索</el-button>
      <el-button icon="el-icon-refresh" @click="reset">重置</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="流水ID" width="80">
        <template slot-scope="{row}"><span :title="row.id">{{ row.id.slice(0,8) }}…</span></template>
      </el-table-column>
      <el-table-column prop="productId" label="商品ID" width="90" />
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
import { getLedger } from '../../api/ledger'
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
  transfer_cancel: { label: '调拨撤销', color: 'info' }
}

export default {
  data() {
    return {
      list: [], total: 0, loading: false, warehouses: [],
      query: { current: 1, size: 20, type: null, locationId: null }
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
      try {
        const res = await getLedger(params)
        this.list = res.data.records
        this.total = res.data.total
      } finally {
        this.loading = false
      }
    },
    search() { this.query.current = 1; this.loadData() },
    reset() { this.query = { current: 1, size: 20, type: null, locationId: null }; this.loadData() },
    typeLabel(t) { return TYPE_MAP[t] ? TYPE_MAP[t].label : t },
    typeColor(t) { return TYPE_MAP[t] ? TYPE_MAP[t].color : '' },
    warehouseName(id) {
      if (!id || id === 0) return '全局'
      const w = this.warehouses.find(w => w.id === id)
      return w ? w.name : id
    }
  }
}
</script>
