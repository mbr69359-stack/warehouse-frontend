<template>
  <trend-report-card prefix="出库" :fetch-fn="getOutReport" bar-color="#E6A23C" line-color="#F56C6C" />
</template>

<script>
import TrendReportCard from '../../components/report/TrendReportCard.vue'
import { getOutReport } from '../../api/report'
export default {
  components: { TrendReportCard },
  methods: { getOutReport }
}
</script>
