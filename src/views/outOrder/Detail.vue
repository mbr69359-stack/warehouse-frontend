<template>
  <order-detail-view
    :fetch-order="getOutOrder"
    :fetch-items="getOutOrderItems"
    :confirm-order="confirmOutOrder"
    doc-label="出库单"
    confirm-button-type="danger"
    confirm-label="确认出库"
    confirm-dialog-title="填写实际出库数量"
    confirm-qty-label="实际出库数量"
    confirm-success-msg="出库确认成功"
    plan-field="qty"
    :box-mode-exclude-types="['DAMAGE_OUT', 'REPLACEMENT_OUT']"
    print-type-field-label="出库类型"
    :print-type-map="printTypeMap">
    <template #descriptions="{ order, warehouseName }">
      <el-descriptions :column="3" border style="margin-bottom:16px;">
        <el-descriptions-item label="仓库">{{ warehouseName }}</el-descriptions-item>
        <el-descriptions-item label="出库类型">{{ typeLabel(order.type) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ order.createTime }}</el-descriptions-item>
        <el-descriptions-item label="确认时间">{{ order.confirmTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ order.customerName || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="order.type==='SALE'" label="销售渠道">
          <el-tag size="mini" :type="order.saleChannel==='RETAIL'?'':'success'">
            {{ order.saleChannel==='RETAIL'?'零售':order.saleChannel==='WHOLESALE'?'批发':'—' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="order.type==='SALE'?1:2">{{ order.remark || '—' }}</el-descriptions-item>
      </el-descriptions>
    </template>
  </order-detail-view>
</template>

<script>
import OrderDetailView from '../../components/order/OrderDetailView.vue'
import { getOutOrder, confirmOutOrder, getOutOrderItems } from '../../api/outOrder'
export default {
  components: { OrderDetailView },
  data() {
    return { printTypeMap: { SALE: '销售出库', TRANSFER: '调拨出库', DAMAGE_OUT: '损坏出库', REPLACEMENT_OUT: '补发出库' } }
  },
  methods: {
    getOutOrder, getOutOrderItems, confirmOutOrder,
    typeLabel(type) {
      const map = { SALE: '销售出库', TRANSFER: '调拨出库', DAMAGE_OUT: '损坏出库', REPLACEMENT_OUT: '补发出库' }
      return map[type] || type || '—'
    }
  }
}
</script>
