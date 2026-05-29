<template>
  <div>
    <el-row :gutter="20" style="margin-bottom:20px;">
      <el-col :span="6" v-for="c in cards" :key="c.label">
        <el-card shadow="hover" style="text-align:center;cursor:pointer;" @click.native="$router.push(c.route)">
          <i :class="c.icon" :style="{fontSize:'36px',color:c.color}"></i>
          <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ c.value }}</div>
          <div style="color:#909399;">{{ c.label }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <div slot="header">快捷入口</div>
          <el-button type="primary" icon="el-icon-download" @click="$router.push('/in-orders/create')">新建入库单</el-button>
          <el-button type="success" icon="el-icon-upload2" style="margin-left:12px;" @click="$router.push('/out-orders/create')">新建出库单</el-button>
          <el-button type="warning" icon="el-icon-document-checked" style="margin-left:12px;" @click="$router.push('/inventory/check')">库存盘点</el-button>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <div slot="header" style="display:flex;justify-content:space-between;">
            <span>库存预警</span>
            <el-link type="primary" @click="$router.push('/inventory/alerts')">查看全部</el-link>
          </div>
          <el-table :data="alerts.slice(0,5)" size="small">
            <el-table-column prop="productId" label="商品ID" width="80" />
            <el-table-column prop="warehouseId" label="仓库ID" width="80" />
            <el-table-column prop="qty" label="当前库存" />
            <el-table-column prop="alertQty" label="预警值" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { getAlerts, getInventory } from '../api/inventory'
import { getInOrders } from '../api/inOrder'
import { getOutOrders } from '../api/outOrder'
export default {
  data() {
    return {
      alerts: [],
      cards: [
        { label: '入库单总数', value: 0, icon: 'el-icon-download', color: '#409EFF', route: '/in-orders' },
        { label: '出库单总数', value: 0, icon: 'el-icon-upload2', color: '#67C23A', route: '/out-orders' },
        { label: '库存预警', value: 0, icon: 'el-icon-warning', color: '#E6A23C', route: '/inventory/alerts' },
        { label: '库存种类', value: 0, icon: 'el-icon-s-grid', color: '#F56C6C', route: '/inventory' }
      ]
    }
  },
  async created() {
    const [alertRes, inRes, outRes, invRes] = await Promise.all([
      getAlerts().catch(() => ({ data: [] })),
      getInOrders({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } })),
      getOutOrders({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } })),
      getInventory({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } }))
    ])
    this.alerts = alertRes.data || []
    this.cards[0].value = inRes.data.total || 0
    this.cards[1].value = outRes.data.total || 0
    this.cards[2].value = this.alerts.length
    this.cards[3].value = invRes.data.total || 0
  }
}
</script>
