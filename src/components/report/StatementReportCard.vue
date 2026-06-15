<template>
  <div>
    <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
      <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">{{ mobileIcon }}</span>
      <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">{{ title }}</p>
      <p style="font-size:13px;color:#757684;">请在电脑端查看</p>
    </div>
    <el-card v-else>
      <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:600;">{{ title }}</span>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
          @change="loadData" style="width:240px;" />
        <el-select v-model="filterEntity" :placeholder="`全部${entityNoun}`" clearable filterable style="width:180px;" @change="loadData">
          <el-option v-for="e in entities" :key="e.id" :label="e.name" :value="e.id" />
        </el-select>
        <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
      </div>

      <el-table :data="tableData" border stripe show-summary :summary-method="getSummary">
        <el-table-column :prop="nameProp" :label="nameLabel" min-width="180" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="orderCount" :label="countLabel" width="90" align="right" />
        <el-table-column :label="qtyLabel" width="100" align="right">
          <template slot-scope="{row}">{{ row.totalQty }}</template>
        </el-table-column>
        <el-table-column :label="amountLabel" width="130" align="right">
          <template slot-scope="{row}">
            <span :style="{ fontWeight: 600, color: amountColor }">KSh {{ fmt(row.totalAmount) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { todayKe, monthsAgoKe } from '../../utils/time'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'
import { money } from '../../utils/format'

export default {
  name: 'StatementReportCard',
  mixins: [mobileMixin],
  props: {
    mobileIcon: { type: String, required: true },     // 移动占位图标，如 handshake / person_check
    title: { type: String, required: true },          // 如「供应商对账单」
    entityNoun: { type: String, required: true },      // 如「供应商」「客户」，用于下拉占位
    entityFetch: { type: Function, required: true },   // 实体列表获取函数
    filterParamKey: { type: String, required: true },  // 筛选参数名，如 supplierId / customerId
    fetchFn: { type: Function, required: true },        // 对账单数据获取函数
    nameProp: { type: String, required: true },         // 名称列字段，如 supplierName
    nameLabel: { type: String, required: true },        // 名称列标题，如「供应商」
    countLabel: { type: String, required: true },       // 单数列标题，如「入库单数」
    qtyLabel: { type: String, required: true },         // 总量列标题
    amountLabel: { type: String, required: true },      // 金额列标题
    amountColor: { type: String, default: '#409EFF' }
  },
  data() {
    return {
      tableData: [], entities: [], filterEntity: null,
      dateRange: [monthsAgoKe(1), todayKe()]
    }
  },
  created() {
    this.entityFetch({ current: 1, size: 500 }).then(r => { this.entities = (r.data && r.data.records) || r.data || [] })
    this.loadData()
  },
  methods: {
    fmt: money,
    async loadData() {
      if (!this.dateRange || !this.dateRange[0]) return
      const params = { startDate: this.dateRange[0], endDate: this.dateRange[1] }
      if (this.filterEntity) params[this.filterParamKey] = this.filterEntity
      const res = await this.fetchFn(params)
      this.tableData = res.data || []
    },
    getSummary({ columns, data }) {
      return columns.map((col, i) => {
        if (i === 0) return '合计'
        if (i === 3) return data.reduce((s, r) => s + Number(r.orderCount || 0), 0)
        if (i === 4) return data.reduce((s, r) => s + Number(r.totalQty || 0), 0)
        if (i === 5) return 'KSh ' + data.reduce((s, r) => s + Number(r.totalAmount || 0), 0).toFixed(2)
        return ''
      })
    },
    handleExport() {
      exportCSV(
        [this.nameLabel, '联系人', '联系电话', this.countLabel, this.qtyLabel, `${this.amountLabel}(元)`],
        this.tableData.map(r => [r[this.nameProp], r.contact || '', r.phone || '', r.orderCount, r.totalQty, this.fmt(r.totalAmount)]),
        `${this.title}_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      )
    }
  }
}
</script>
