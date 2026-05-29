<template>
  <el-card>
    <div style="margin-bottom:16px;display:flex;gap:12px;">
      <el-select v-model="query.status" placeholder="状态" clearable style="width:130px;" @change="loadData">
        <el-option label="草稿" value="DRAFT" /><el-option label="已确认" value="CONFIRMED" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="loadData">搜索</el-button>
      <el-button type="success" icon="el-icon-plus" @click="$router.push('/out-orders/create')">新建出库单</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="orderNo" label="出库单号" width="200" />
      <el-table-column prop="type" label="类型" width="100">
        <template slot-scope="{row}">{{ row.type==='SALE'?'销售出库':'调拨出库' }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template slot-scope="{row}"><el-tag :type="row.status==='CONFIRMED'?'success':'warning'">{{ row.status==='CONFIRMED'?'已确认':'草稿' }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column label="操作" width="200">
        <template slot-scope="{row}">
          <el-button size="mini" @click="$router.push('/out-orders/'+row.id)">详情</el-button>
          <el-button size="mini" type="danger" v-if="row.status==='DRAFT'" @click="handleConfirm(row.id)">确认出库</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
      :total="total" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />
  </el-card>
</template>

<script>
import { getOutOrders, confirmOutOrder } from '../../api/outOrder'
export default {
  data() { return { list: [], total: 0, loading: false, query: { current: 1, size: 10, status: null } } },
  created() { this.loadData() },
  methods: {
    async loadData() { this.loading = true; const r = await getOutOrders(this.query).finally(() => { this.loading = false }); this.list = r.data.records; this.total = r.data.total },
    async handleConfirm(id) {
      await this.$confirm('确认出库后库存将扣减，是否继续？', '提示', { type: 'warning' })
      await confirmOutOrder(id); this.$message.success('出库确认成功'); this.loadData()
    }
  }
}
</script>
