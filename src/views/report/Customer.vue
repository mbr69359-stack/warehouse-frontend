<template>
  <statement-report-card
    mobile-icon="person_check"
    title="客户对账单"
    entity-noun="客户"
    :entity-fetch="getCustomers"
    filter-param-key="customerId"
    :fetch-fn="getCustomerStatement"
    name-prop="customerName"
    name-label="客户名称"
    count-label="出库单数"
    qty-label="出库总量"
    amount-label="出货总金额"
    amount-color="#E6A23C" />
</template>

<script>
import StatementReportCard from '../../components/report/StatementReportCard.vue'
import { getCustomerStatement } from '../../api/report'
import { getCustomers } from '../../api/customer'
export default {
  components: { StatementReportCard },
  methods: { getCustomerStatement, getCustomers }
}
</script>
