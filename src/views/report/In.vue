<template>
  <trend-report-card prefix="入库" :fetch-fn="getInReport" bar-color="#409EFF" line-color="#67C23A" />
</template>

<script>
import TrendReportCard from '../../components/report/TrendReportCard.vue'
import { getInReport } from '../../api/report'
export default {
  components: { TrendReportCard },
  methods: { getInReport }
}
</script>
