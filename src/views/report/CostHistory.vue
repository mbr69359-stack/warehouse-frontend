<template>
  <el-card>
    <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <span style="font-weight:600;">成本价历史</span>
      <el-select v-model="productId" filterable clearable placeholder="请选择商品查看成本变动"
        style="width:300px;" @change="loadData">
        <el-option
          v-for="p in products" :key="p.id"
          :label="p.name + (p.skuCode ? '  (' + p.skuCode + ')' : '')"
          :value="p.id" />
      </el-select>
    </div>

    <div v-if="!productId" style="color:#909399;text-align:center;padding:60px 0;font-size:14px;">
      请先在上方选择商品，查看其成本价变动记录
    </div>

    <template v-else>
      <div v-if="currentProduct" style="margin-bottom:16px;padding:12px 16px;background:#f5f7fa;border-radius:4px;display:flex;gap:32px;flex-wrap:wrap;font-size:14px;">
        <span>商品：<strong>{{ currentProduct.name }}</strong></span>
        <span v-if="currentProduct.skuCode">SKU：<strong>{{ currentProduct.skuCode }}</strong></span>
        <span>当前成本价：<strong style="color:#409EFF;font-size:16px;">KSh {{ fmt(currentProduct.costPrice) }}</strong></span>
      </div>

      <el-table :data="tableData" border stripe v-loading="loading" style="width:100%;"
        empty-text="该商品暂无成本价变更记录">
        <el-table-column prop="changedAt" label="变更时间" width="170">
          <template slot-scope="{row}">{{ fmtTime(row.changedAt) }}</template>
        </el-table-column>
        <el-table-column prop="orderNo" label="关联单号" width="215" />
        <el-table-column label="原成本价" align="right" width="130">
          <template slot-scope="{row}">KSh {{ fmt(row.oldPrice) }}</template>
        </el-table-column>
        <el-table-column label="新成本价" align="right" width="130">
          <template slot-scope="{row}">KSh {{ fmt(row.newPrice) }}</template>
        </el-table-column>
        <el-table-column label="变动金额" align="right" width="120">
          <template slot-scope="{row}">
            <span :style="{ fontWeight:'600', color: delta(row) > 0 ? '#F56C6C' : delta(row) < 0 ? '#67C23A' : '#909399' }">
              {{ delta(row) > 0 ? '+' : '' }}{{ fmt(delta(row)) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作数量" align="right" width="110">
          <template slot-scope="{row}">
            <span :style="{ color: row.qtyAdded < 0 ? '#E6A23C' : '#303133' }">
              {{ row.qtyAdded > 0 ? '+' : '' }}{{ row.qtyAdded }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template slot-scope="{row}">
            <el-tag v-if="row.qtyAdded < 0" size="mini" type="warning">撤销入库</el-tag>
            <el-tag v-else size="mini" type="success">入库调价</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="均价变动趋势" align="center" min-width="120">
          <template slot-scope="{row}">
            <span v-if="delta(row) > 0" style="color:#F56C6C;">↑ 涨价</span>
            <span v-else-if="delta(row) < 0" style="color:#67C23A;">↓ 降价</span>
            <span v-else style="color:#909399;">持平</span>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </el-card>
</template>

<script>
import { getProducts, getProductCostHistory } from '../../api/product'
import { money } from '../../utils/format'

export default {
  data() {
    return {
      loading: false,
      productId: null,
      products: [],
      tableData: [],
      currentProduct: null
    }
  },
  created() {
    this.loadProducts()
  },
  methods: {
    async loadProducts() {
      try {
        const res = await getProducts({ size: 1000 })
        this.products = res.data?.records || res.data || []
      } catch (e) {
        this.products = []
      }
    },

    async loadData() {
      if (!this.productId) {
        this.tableData = []
        this.currentProduct = null
        return
      }
      this.currentProduct = this.products.find(p => p.id === this.productId) || null
      this.loading = true
      try {
        const res = await getProductCostHistory(this.productId)
        this.tableData = res.data || []
      } catch (e) {
        this.tableData = []
      } finally {
        this.loading = false
      }
    },

    fmt: money,

    fmtTime(v) {
      if (!v) return '-'
      return String(v).replace('T', ' ').slice(0, 19)
    },

    delta(row) {
      return Number(row.newPrice || 0) - Number(row.oldPrice || 0)
    }
  }
}
</script>