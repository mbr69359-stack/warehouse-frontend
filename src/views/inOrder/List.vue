<template>
  <div>

    <!-- ── 桌面端 ── -->
    <el-card v-if="!isMobile">
      <div style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
        <el-select v-model="query.status" placeholder="状态" clearable style="width:130px;" @change="loadData">
          <el-option label="草稿" value="DRAFT" /><el-option label="已确认" value="CONFIRMED" /><el-option label="已作废" value="VOIDED" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd"
          style="width:260px;" @change="onDateRangeChange" />
        <el-button type="primary" icon="el-icon-search" @click="loadData">搜索</el-button>
        <el-button type="success" icon="el-icon-plus" @click="$router.push('/in-orders/create')">新建入库单</el-button>
      </div>
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="orderNo" label="入库单号" width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template slot-scope="{row}">{{ row.type==='PURCHASE'?'采购入库':'退货入库' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="{row}">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="320">
          <template slot-scope="{row}">
            <el-button size="mini" @click="$router.push('/in-orders/'+row.id)">详情</el-button>
            <el-button size="mini" type="primary"
              v-if="row.status==='DRAFT' && row.type!=='RETURN_IN'"
              @click="$router.push('/in-orders/edit/'+row.id)">编辑</el-button>
            <el-button size="mini" type="success" v-if="row.status==='DRAFT'" @click="openConfirmDialog(row.id)">确认实际数量</el-button>
            <el-button size="mini" type="danger" v-if="row.status!=='VOIDED'" @click="handleDelete(row.id, row.status)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
        :total="total" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />
    </el-card>

    <!-- ── 移动端 ── -->
    <div v-else class="m-page">

      <!-- 搜索栏 -->
      <div class="m-search-bar">
        <div class="m-search-wrapper">
          <span class="material-symbols-outlined m-search-icon">search</span>
          <input class="m-search-input" v-model="mobileSearch" placeholder="输入单据号或扫描条码" />
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

      <!-- 卡片列表 -->
      <div v-else class="m-order-list">
        <div v-for="row in filteredList" :key="row.id" class="m-order-card"
          @click="$router.push('/in-orders/'+row.id)">
          <div class="m-order-header">
            <div>
              <div class="m-order-no">{{ row.orderNo }}</div>
              <div class="m-order-meta">{{ row.type==='PURCHASE'?'采购入库':'退货入库' }}</div>
            </div>
            <span class="m-status-badge" :class="row.status==='CONFIRMED'?'success':row.status==='VOIDED'?'pending':'warning'">
              {{ row.status==='CONFIRMED'?'已确认':row.status==='VOIDED'?'已作废':'待收货' }}
            </span>
          </div>
          <div class="m-order-footer">
            <span class="m-order-time">{{ row.createTime }}</span>
            <div style="display:flex;gap:6px;">
              <button v-if="row.status==='DRAFT'" class="m-action-btn primary"
                @click.stop="openConfirmDialog(row.id)">
                <span class="material-symbols-outlined" style="font-size:15px;">play_arrow</span>
                确认实际数量
              </button>
              <button v-else class="m-action-btn outline"
                @click.stop="$router.push('/in-orders/'+row.id)">
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
          <p>暂无入库任务</p>
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
      <button class="mobile-fab" @click="$router.push('/in-orders/create')">
        <span class="material-symbols-outlined">add</span>
      </button>
    </div>

    <!-- 确认入库弹窗 -->
    <el-dialog title="填写实际入库数量" :visible.sync="dialogVisible" width="560px" :close-on-click-modal="false">
      <div v-loading="dialogLoading">
        <el-table :data="confirmItems" border>
          <el-table-column prop="productId" label="商品ID" width="100" />
          <el-table-column prop="planQty" label="计划数量" width="110" />
          <el-table-column label="实际入库数量">
            <template slot-scope="{row}">
              <el-input-number v-model="row.actualQty" :min="0" size="small" style="width:140px;" />
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="success" :loading="confirming" @click="submitConfirm">确认实际数量</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import { getInOrders, confirmInOrder, deleteInOrder, getInOrderItems } from '../../api/inOrder'
import mobileMixin from '../../mixins/mobile'
export default {
  mixins: [mobileMixin],
  data() {
    return {
      list: [], total: 0, loading: false,
      mobileSearch: '',
      dateRange: null,
      query: { current: 1, size: 10, status: null, startDate: null, endDate: null },
      statusTabs: [
        { label: '全部',   value: null },
        { label: '待收货', value: 'DRAFT' },
        { label: '已确认', value: 'CONFIRMED' },
        { label: '已作废', value: 'VOIDED' }
      ],
      dialogVisible: false, dialogLoading: false, confirming: false,
      currentOrderId: null, confirmItems: []
    }
  },
  computed: {
    filteredList() {
      if (!this.mobileSearch) return this.list
      const kw = this.mobileSearch.toLowerCase()
      return this.list.filter(r => r.orderNo && r.orderNo.toLowerCase().includes(kw))
    }
  },
  created() { this.loadData() },
  methods: {
    statusTagType(status) {
      return status === 'CONFIRMED' ? 'success' : status === 'VOIDED' ? 'info' : 'warning'
    },
    statusLabel(status) {
      return status === 'CONFIRMED' ? '已确认' : status === 'VOIDED' ? '已作废' : '草稿'
    },
    async loadData() {
      this.loading = true
      const r = await getInOrders(this.query).finally(() => { this.loading = false })
      this.list = r.data.records
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
    async openConfirmDialog(id) {
      this.confirmItems = []
      this.currentOrderId = id
      this.dialogVisible = true
      this.dialogLoading = true
      try {
        const r = await getInOrderItems(id)
        this.confirmItems = (r.data || []).map(i => ({
          id: i.id, productId: i.productId,
          planQty: i.planQty, actualQty: i.planQty || 0
        }))
      } finally {
        this.dialogLoading = false
      }
    },
    async submitConfirm() {
      this.confirming = true
      try {
        const payload = this.confirmItems.map(i => ({ itemId: i.id, actualQty: i.actualQty || 0 }))
        await confirmInOrder(this.currentOrderId, payload)
        this.$message.success('入库确认成功')
        this.dialogVisible = false
        this.loadData()
      } finally {
        this.confirming = false
      }
    },
    async handleDelete(id, status) {
      const msg = status === 'CONFIRMED'
        ? '作废后将冲销库存，单据保留可查，确认作废？'
        : '确认删除该草稿入库单？'
      await this.$confirm(msg, '警告', { type: 'warning' })
      await deleteInOrder(id)
      this.$message.success(status === 'CONFIRMED' ? '单据已作废' : '删除成功')
      this.loadData()
    }
  }
}
</script>