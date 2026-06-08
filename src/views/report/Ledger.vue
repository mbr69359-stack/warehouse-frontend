<template>
  <div>
    <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
      <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">receipt_long</span>
      <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">流水报表</p>
      <p style="font-size:13px;color:#757684;">请在电脑端查看</p>
    </div>
    <el-card v-else>
      <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:600;">流水报表</span>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
          @change="loadData" style="width:240px;" />
        <el-select v-model="filterType" placeholder="全部类型" clearable style="width:130px;" @change="loadData">
          <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        <el-select v-model="filterWarehouse" placeholder="全部仓库" clearable style="width:130px;" @change="loadData">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-button icon="el-icon-download" @click="handleExport" :disabled="!tableData.length">导出 Excel</el-button>
        <span style="color:#999;font-size:12px;">共 {{ tableData.length }} 条</span>
      </div>
      <el-table :data="tableData" border stripe size="small" style="width:100%;">
        <el-table-column prop="occurredAt" label="时间" width="135" />
        <el-table-column prop="warehouseName" label="仓库" width="100" />
        <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="skuCode" label="SKU" width="120" />
        <el-table-column label="类型" width="100">
          <template slot-scope="{row}">
            <el-tag :type="typeTagMap[row.type] || 'info'" size="mini">{{ typeLabelMap[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变动数量" width="100" align="right">
          <template slot-scope="{row}">
            <span :style="{ color: row.changeQty > 0 ? '#67C23A' : '#F56C6C', fontWeight: 600 }">
              {{ row.changeQty > 0 ? '+' : '' }}{{ row.changeQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="documentNo" label="单据号" width="150" show-overflow-tooltip />
        <el-table-column prop="operator" label="操作人" width="90" />
        <el-table-column prop="note" label="备注" min-width="120" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { todayKe, daysAgoKe } from '../../utils/time'
import { getLedgerReport } from '../../api/report'
import { getWarehouses } from '../../api/warehouse'
import mobileMixin from '../../mixins/mobile'
import { exportCSV } from '../../utils/export'

const TYPE_LABEL = {
  inbound: '入库', outbound: '出库', adjust: '库存调整',
  transfer: '调拨(出)', transfer_in: '调拨(入)', opening: '期初',
  inbound_cancel: '入库撤销', outbound_cancel: '出库撤销', transfer_cancel: '调拨撤销'
}
const TYPE_TAG = {
  inbound: 'success', outbound: 'danger', adjust: 'warning',
  transfer: '', transfer_in: 'success', opening: 'info',
  inbound_cancel: 'info', outbound_cancel: 'info', transfer_cancel: 'info'
}

export default {
  mixins: [mobileMixin],
  data() {
    return {
      tableData: [], warehouses: [],
      dateRange: [daysAgoKe(29), todayKe()],
      filterType: '', filterWarehouse: null,
      typeLabelMap: TYPE_LABEL, typeTagMap: TYPE_TAG,
      typeOptions: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data || [] })
    this.loadData()
  },
  methods: {
    async loadData() {
      if (!this.dateRange || !this.dateRange[0]) return
      const params = { startDate: this.dateRange[0], endDate: this.dateRange[1] }
      if (this.filterType) params.type = this.filterType
      if (this.filterWarehouse) params.warehouseId = this.filterWarehouse
      const res = await getLedgerReport(params)
      this.tableData = res.data || []
    },
    handleExport() {
      const filename = `流水报表_${this.dateRange[0]}_${this.dateRange[1]}.csv`
      exportCSV(
        ['时间', '仓库', '商品名称', 'SKU', '单位', '类型', '变动数量', '单据号', '操作人', '备注'],
        this.tableData.map(r => [
          r.occurredAt, r.warehouseName, r.productName, r.skuCode, r.unit,
          TYPE_LABEL[r.type] || r.type, r.changeQty, r.documentNo || '', r.operator || '', r.note || ''
        ]),
        filename
      )
    }
  }
}
</script>
