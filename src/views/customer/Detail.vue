<template>
  <el-card v-loading="loading">
    <!-- 页面头部：返回按钮 + 标题 -->
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>客户详情 — {{ customer.name }}</span>
    </div>

    <!-- 客户基本信息 -->
    <el-descriptions :column="2" border style="margin-bottom:24px;">
      <el-descriptions-item label="客户名称">{{ customer.name }}</el-descriptions-item>
      <el-descriptions-item label="联系人">{{ customer.contact || '—' }}</el-descriptions-item>
      <el-descriptions-item label="电话">{{ customer.phone || '—' }}</el-descriptions-item>
      <el-descriptions-item label="地址">{{ customer.address || '—' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ customer.remark || '—' }}</el-descriptions-item>
    </el-descriptions>

    <!-- 历史出库单标题 + 总消费额 -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <span style="font-weight:bold;">历史出库单</span>
      <span style="font-size:15px;">
        总消费额（已确认）：
        <b style="color:#409EFF;font-size:18px;">KSh {{ totalAmount }}</b>
      </span>
    </div>

    <!-- 历史出库单表格 -->
    <el-table :data="orders" border stripe>
      <el-table-column prop="orderNo" label="出库单号" width="200" />
      <el-table-column prop="type" label="类型" width="100">
        <template slot-scope="{row}">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template slot-scope="{row}">
          <el-tag :type="row.status==='CONFIRMED'?'success':'warning'">
            {{ row.status==='CONFIRMED'?'已确认':'草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column label="操作" width="80">
        <template slot-scope="{row}">
          <el-button size="mini" @click="$router.push('/out-orders/'+row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import { getCustomerOrders } from '../../api/customer'

export default {
  data() {
    return {
      customer: {},
      orders: [],
      totalAmount: '0.00',
      loading: false
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    // 出库类型中文标签
    typeLabel(type) {
      const map = {
        SALE: '销售出库',
        TRANSFER: '调拨出库',
        DAMAGE_OUT: '损坏出库',
        REPLACEMENT_OUT: '补发出库'
      }
      return map[type] || type || '—'
    },
    // 加载客户详情及历史出库单
    async loadData() {
      this.loading = true
      try {
        const r = await getCustomerOrders(this.$route.params.id)
        const vo = r.data
        this.customer = vo.customer || {}
        this.orders = vo.orders || []
        this.totalAmount = Number(vo.totalAmount || 0).toFixed(2)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>