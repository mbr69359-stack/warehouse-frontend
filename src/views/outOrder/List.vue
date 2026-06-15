<template>
  <div>

    <!-- ── 桌面端 ── -->
    <el-card v-if="!isMobile">
      <el-alert v-if="totalDraftCount > 0"
        :title="`您有 ${totalDraftCount} 张出库单待确认实际数量`"
        type="warning" show-icon :closable="false"
        style="margin-bottom:16px;cursor:pointer;"
        @click.native="switchToDraft" />
      <div style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
        <el-select v-model="query.status" placeholder="状态" clearable style="width:130px;" @change="loadData">
          <el-option label="草稿" value="DRAFT" /><el-option label="已确认" value="CONFIRMED" /><el-option label="已作废" value="VOIDED" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
          style="width:260px;" @change="onDateRangeChange" />
        <el-button type="primary" icon="el-icon-search" @click="loadData">搜索</el-button>
        <el-button type="success" icon="el-icon-plus" @click="$router.push('/out-orders/create')">新建出库单</el-button>
      </div>
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="orderNo" label="出库单号" width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template slot-scope="{row}">{{ typeLabel(row.type) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="{row}">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" width="120" show-overflow-tooltip>
          <template slot-scope="{row}">{{ row.customerName || '—' }}</template>
        </el-table-column>
        <el-table-column label="销售渠道" width="100" align="center">
          <template slot-scope="{row}">
            <el-tag v-if="row.type==='SALE' && row.saleChannel" size="mini"
              :type="row.saleChannel==='RETAIL'?'':'success'">
              {{ row.saleChannel==='RETAIL'?'零售':'批发' }}
            </el-tag>
            <span v-else style="color:#c0c4cc;">—</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template slot-scope="{row}">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="320">
          <template slot-scope="{row}">
            <el-button size="mini" @click="$router.push('/out-orders/'+row.id)">详情</el-button>
            <el-button size="mini" type="primary"
              v-if="row.status==='DRAFT' && (row.type==='SALE' || row.type==='TRANSFER')"
              @click="$router.push('/out-orders/edit/'+row.id)">编辑</el-button>
            <el-button size="mini" type="danger" v-if="row.status==='DRAFT'" @click="openConfirmDialog(row.id)">确认实际数量</el-button>
            <el-button size="mini" type="danger" v-if="row.status!=='VOIDED'" @click="handleDelete(row.id, row.status)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
        :total="total" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />
    </el-card>

    <!-- ── 移动端 ── -->
    <div v-else class="m-page">

      <!-- 进度概览 -->
      <div class="mo-progress-bar">
        <div class="mo-progress-header">
          <h2 class="m-page-title" style="margin:0;">待检货清单</h2>
          <span class="mo-progress-label">今日进度: {{ draftCount }} / {{ total }}</span>
        </div>
        <div class="mo-track">
          <div class="mo-fill" :style="{ width: total ? ((total-draftCount)/total*100)+'%' : '0%' }"></div>
        </div>
        <div class="mo-stats">
          <div class="mo-stat">
            <span class="mo-stat-label">待处理</span>
            <span class="mo-stat-val">{{ draftCount }} <small>任务</small></span>
          </div>
          <div class="mo-stat">
            <span class="mo-stat-label">已完成</span>
            <span class="mo-stat-val secondary">{{ total - draftCount }} <small>任务</small></span>
          </div>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="m-search-bar">
        <div class="m-search-wrapper">
          <span class="material-symbols-outlined m-search-icon">search</span>
          <input class="m-search-input" v-model="mobileSearch" placeholder="输入出库单号" />
        </div>
        <button class="m-scan-btn">
          <span class="material-symbols-outlined">qr_code_scanner</span>
        </button>
      </div>

      <!-- 状态 Tab -->
      <div class="m-tabs">
        <button v-for="t in statusTabs" :key="t.value"
          class="m-tab" :class="{ active: query.status === t.value }"
          @click="switchTab(t.value)">{{ t.label }}</button>
      </div>

      <!-- loading -->
      <div v-if="loading" style="text-align:center;padding:40px;">
        <span class="material-symbols-outlined" style="font-size:36px;color:#757684;animation:spin 1s linear infinite;">sync</span>
      </div>

      <!-- 任务卡片 -->
      <div v-else class="m-order-list">
        <div v-for="row in filteredList" :key="row.id"
          class="m-order-card" :class="{ urgent: row.status==='DRAFT' }"
          @click="$router.push('/out-orders/'+row.id)">
          <div class="m-order-header">
            <div>
              <div class="m-order-no">{{ row.orderNo }}</div>
              <div class="m-order-meta">{{ typeLabel(row.type) }}</div>
            </div>
            <span class="m-status-badge" :class="row.status==='CONFIRMED'?'success':row.status==='VOIDED'?'pending':'warning'">
              {{ row.status==='CONFIRMED'?'已完成':row.status==='VOIDED'?'已作废':'待出库' }}
            </span>
          </div>
          <div class="m-order-footer">
            <span class="m-order-time">{{ formatDateTime(row.createTime) }}</span>
            <div style="display:flex;gap:6px;">
              <button v-if="row.status==='DRAFT'" class="m-action-btn danger"
                @click.stop="openConfirmDialog(row.id)">
                <span class="material-symbols-outlined" style="font-size:15px;">output</span>
                确认实际数量
              </button>
              <button v-else class="m-action-btn outline"
                @click.stop="$router.push('/out-orders/'+row.id)">
                <span class="material-symbols-outlined" style="font-size:15px;">visibility</span>
                查看详情
              </button>
              <button v-if="row.status!=='VOIDED'" class="m-action-btn danger" @click.stop="handleDelete(row.id, row.status)">
                <span class="material-symbols-outlined" style="font-size:15px;">delete</span>
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-if="!filteredList.length" class="m-empty">
          <span class="material-symbols-outlined">inventory</span>
          <p>暂无出库任务</p>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > query.size" class="m-pagination">
        <button class="m-page-btn" :disabled="query.current<=1" @click="prevPage">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <span class="m-page-info">{{ query.current }} / {{ Math.ceil(total/query.size) }}</span>
        <button class="m-page-btn" :disabled="query.current>=Math.ceil(total/query.size)" @click="nextPage">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <!-- FAB -->
      <button class="mobile-fab" @click="$router.push('/out-orders/create')">
        <span class="material-symbols-outlined">add</span>
      </button>
    </div>

    <confirm-qty-dialog ref="confirmDialog"
      title="填写实际出库数量" qty-label="实际出库数量"
      button-type="danger" success-msg="出库确认成功"
      :fetch-items="getOutOrderItems" :confirm-fn="confirmOutOrder"
      plan-field="qty" @confirmed="onConfirmed" />

  </div>
</template>

<script>
import { getOutOrders, confirmOutOrder, deleteOutOrder, getOutOrderItems, getDraftOutOrderCount } from '../../api/outOrder'
import mobileMixin from '../../mixins/mobile'
import { formatDateTime } from '../../utils/time'
import ConfirmQtyDialog from '../../components/order/ConfirmQtyDialog.vue'
export default {
  mixins: [mobileMixin],
  components: { ConfirmQtyDialog },
  data() {
    return {
      list: [], total: 0, loading: false, totalDraftCount: 0,
      mobileSearch: '',
      dateRange: null,
      query: { current: 1, size: 10, status: null, startDate: null, endDate: null },
      statusTabs: [
        { label: '全部',   value: null },
        { label: '待出库', value: 'DRAFT' },
        { label: '已确认', value: 'CONFIRMED' },
        { label: '已作废', value: 'VOIDED' }
      ]
    }
  },
  computed: {
    filteredList() {
      if (!this.mobileSearch) return this.list
      const kw = this.mobileSearch.toLowerCase()
      return this.list.filter(r => r.orderNo && r.orderNo.toLowerCase().includes(kw))
    },
    draftCount() {
      return this.list.filter(r => r.status === 'DRAFT').length
    }
  },
  created() { this.loadData(); this.refreshDraftCount() },
  methods: {
    refreshDraftCount() {
      getDraftOutOrderCount().then(n => { this.totalDraftCount = n })
    },
    switchToDraft() { this.query.status = 'DRAFT'; this.query.current = 1; this.loadData() },
    typeLabel(type) {
      const map = { SALE: '销售出库', TRANSFER: '调拨出库', DAMAGE_OUT: '损坏出库', REPLACEMENT_OUT: '换货补发' }
      return map[type] || type
    },
    statusTagType(status) {
      return status === 'CONFIRMED' ? 'success' : status === 'VOIDED' ? 'info' : 'warning'
    },
    statusLabel(status) {
      return status === 'CONFIRMED' ? '已确认' : status === 'VOIDED' ? '已作废' : '草稿'
    },
    async loadData() {
      this.loading = true
      const r = await getOutOrders(this.query).finally(() => { this.loading = false })
      this.list  = r.data.records
      this.total = r.data.total
    },
    onDateRangeChange(val) {
      this.query.startDate = val ? val[0] : null
      this.query.endDate = val ? val[1] : null
      this.query.current = 1
      this.loadData()
    },
    switchTab(val) { this.query.status = val; this.query.current = 1; this.loadData() },
    prevPage() { this.query.current--; this.loadData() },
    nextPage() { this.query.current++; this.loadData() },
    getOutOrderItems, confirmOutOrder, formatDateTime,
    openConfirmDialog(id) { this.$refs.confirmDialog.open(id) },
    onConfirmed() { this.loadData(); this.refreshDraftCount() },
    async handleDelete(id, status) {
      const msg = status === 'CONFIRMED'
        ? '作废后将冲销库存，单据保留可查，确认作废？'
        : '确认删除该草稿出库单？'
      await this.$confirm(msg, '警告', { type: 'warning' })
      await deleteOutOrder(id)
      this.$message.success(status === 'CONFIRMED' ? '单据已作废' : '删除成功')
      this.loadData()
    }
  }
}
</script>

<style scoped>
.mo-progress-bar {
  padding: 16px 16px 12px;
  background: #fff;
  border-bottom: 1px solid #e6eeff;
  margin-bottom: 4px;
}
.mo-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10px;
}
.mo-progress-label { font-size: 12px; color: #855300; font-weight: 600; }
.mo-track {
  width: 100%; height: 6px; background: #e6eeff;
  border-radius: 3px; overflow: hidden; margin-bottom: 10px;
}
.mo-fill {
  height: 100%; background: #00288e;
  border-radius: 3px; transition: width .5s;
}
.mo-stats { display: flex; gap: 24px; }
.mo-stat  { display: flex; flex-direction: column; }
.mo-stat-label { font-size: 10px; color: #757684; text-transform: uppercase; letter-spacing: .04em; }
.mo-stat-val   { font-size: 20px; font-weight: 700; color: #00288e; line-height: 1.1; }
.mo-stat-val.secondary { color: #855300; }
.mo-stat-val small { font-size: 12px; font-weight: 400; color: #757684; margin-left: 2px; }
.m-order-card.urgent { border-left: 4px solid #ba1a1a; }
</style>
