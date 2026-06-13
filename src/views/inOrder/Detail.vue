<template>
  <order-detail-view
    :fetch-order="getInOrder"
    :fetch-items="getInOrderItems"
    :confirm-order="confirmInOrder"
    doc-label="入库单"
    confirm-button-type="success"
    confirm-label="确认入库"
    confirm-dialog-title="填写实际入库数量"
    confirm-qty-label="实际入库数量"
    confirm-success-msg="入库确认成功"
    plan-field="planQty"
    print-type-field-label="入库类型"
    :print-type-map="printTypeMap">
    <template #descriptions="{ order, warehouseName }">
      <el-descriptions :column="3" border style="margin-bottom:16px;">
        <el-descriptions-item label="仓库">{{ warehouseName }}</el-descriptions-item>
        <el-descriptions-item label="入库类型">{{ order.type==='PURCHASE'?'采购入库':'退货入库' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ order.createTime }}</el-descriptions-item>
        <el-descriptions-item label="确认时间">{{ order.confirmTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ order.remark || '—' }}</el-descriptions-item>
      </el-descriptions>
    </template>
  </order-detail-view>
</template>

<script>
import OrderDetailView from '../../components/order/OrderDetailView.vue'
import { getInOrder, confirmInOrder, getInOrderItems } from '../../api/inOrder'
export default {
  components: { OrderDetailView },
  data() {
    return { printTypeMap: { PURCHASE: '采购入库', RETURN: '退货入库' } }
  },
  methods: { getInOrder, getInOrderItems, confirmInOrder }
}
</script>
