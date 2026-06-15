<template>
  <statement-report-card
    mobile-icon="handshake"
    title="供应商对账单"
    entity-noun="供应商"
    :entity-fetch="getSuppliers"
    filter-param-key="supplierId"
    :fetch-fn="getSupplierStatement"
    name-prop="supplierName"
    name-label="供应商"
    count-label="入库单数"
    qty-label="入库总量"
    amount-label="入库总金额"
    amount-color="#409EFF" />
</template>

<script>
import StatementReportCard from '../../components/report/StatementReportCard.vue'
import { getSupplierStatement } from '../../api/report'
import { getSuppliers } from '../../api/supplier'
export default {
  components: { StatementReportCard },
  methods: { getSupplierStatement, getSuppliers }
}
</script>
