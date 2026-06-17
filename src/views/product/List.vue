<template>
  <el-card>
    <div style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
      <el-input v-model="query.name" placeholder="商品名称" clearable style="width:200px;" @clear="loadData" />
      <el-select v-model="query.categoryId" placeholder="商品分类" clearable style="width:150px;" @change="loadData">
        <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="loadData">搜索</el-button>
      <el-button type="success" icon="el-icon-plus" @click="openForm()">新增商品</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="商品名称" />
      <el-table-column prop="categoryName" label="分类" width="110" show-overflow-tooltip>
        <template slot-scope="{row}">
          <span v-if="row.categoryName">{{ row.categoryName }}</span>
          <span v-else style="color:#c0c4cc;">未分类</span>
        </template>
      </el-table-column>
      <el-table-column prop="skuCode" label="SKU编码" width="140" />
      <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
      <el-table-column prop="barcode" label="条码" width="130" show-overflow-tooltip />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="price" label="价格" width="100"><template slot-scope="{row}">KSh {{ row.price }}</template></el-table-column>
      <el-table-column prop="costPrice" label="成本价" width="100"><template slot-scope="{row}">KSh {{ row.costPrice || '0.00' }}</template></el-table-column>
      <el-table-column label="箱规" width="140" show-overflow-tooltip>
        <template slot-scope="{row}">
          <span v-if="row.weightPerBox || row.qtyPerBox">
            {{ row.weightPerBox ? row.weightPerBox + 'kg' : '—' }} / {{ row.qtyPerBox ? row.qtyPerBox + '个' : '—' }}
          </span>
          <span v-else style="color:#c0c4cc;">未设置</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template slot-scope="{row}"><el-tag :type="row.status===1?'success':'info'">{{ row.status===1?'上架':'下架' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="240">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" @click="openForm(row)">编辑</el-button>
          <el-button size="mini" type="warning" @click="openCostHistory(row)">进价历史</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, sizes, prev, pager, next"
      :total="total" :page-size="query.size" :current-page="query.current"
      @current-change="p=>{query.current=p;loadData()}" @size-change="s=>{query.size=s;loadData()}" />

    <!-- 进价历史对话框 -->
    <el-dialog :title="historyProductName + ' · 进价历史'" :visible.sync="historyVisible" width="720px" @open="renderHistoryChart">
      <div ref="historyChart" style="width:100%;height:260px;margin-bottom:16px;" />
      <el-table :data="historyList" border size="small" v-loading="historyLoading">
        <el-table-column label="时间" prop="changedAt" width="160" />
        <el-table-column label="旧均价" width="110" align="right">
          <template slot-scope="{row}">KSh {{ row.oldPrice }}</template>
        </el-table-column>
        <el-table-column label="新均价" width="110" align="right">
          <template slot-scope="{row}">
            <span :style="{color: row.newPrice > row.oldPrice ? '#F56C6C' : '#67C23A', fontWeight:'bold'}">
              KSh {{ row.newPrice }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="本次入库量" prop="qtyAdded" width="100" align="center" />
        <el-table-column label="关联入库单" prop="orderNo" />
      </el-table>
      <div v-if="!historyLoading && historyList.length === 0" style="text-align:center;color:#909399;padding:20px 0;">
        暂无进价变动记录
      </div>
    </el-dialog>

    <el-dialog :title="form.id?'编辑商品':'新增商品'" :visible.sync="dialogVisible" width="500px">
      <el-form :model="form" :rules="rules" ref="form" label-width="90px">
        <el-form-item label="商品名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="SKU编码" prop="skuCode"><el-input v-model="form.skuCode" :disabled="!!form.id" /></el-form-item>
        <el-form-item label="商品分类">
          <el-select v-model="form.categoryId" placeholder="请选择" clearable style="width:100%;">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="规格"><el-input v-model="form.spec" placeholder="如：128GB/黑色" /></el-form-item>
        <el-form-item label="条码"><el-input v-model="form.barcode" placeholder="EAN/UPC" /></el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-select v-model="form.unit" filterable allow-create default-first-option placeholder="选择或输入新单位" style="width:100%;">
            <el-option v-for="u in unitOptions" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price"><el-input-number v-model="form.price" :precision="2" :min="0" style="width:100%;" /></el-form-item>
        <el-form-item label="成本价">
          <span>KSh {{ form.costPrice || '0.00' }}</span>
          <span style="color:#909399;font-size:12px;margin-left:8px;">由采购入库加权平均自动计算，不可手动修改</span>
        </el-form-item>
        <el-form-item label="每箱重量(kg)"><el-input-number v-model="form.weightPerBox" :precision="2" :min="0" :placeholder="null" style="width:100%;" /></el-form-item>
        <el-form-item label="每箱个数"><el-input-number v-model="form.qtyPerBox" :min="0" :precision="0" :placeholder="null" style="width:100%;" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status"><el-radio :label="1">上架</el-radio><el-radio :label="0">下架</el-radio></el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import * as echarts from 'echarts'
import { getProducts, createProduct, updateProduct, deleteProduct, getProductCostHistory } from '../../api/product'
import { getCategories } from '../../api/category'
export default {
  data() {
    return {
      list: [], total: 0, loading: false, saving: false, dialogVisible: false, categories: [],
      originalQtyPerBox: null, unitOptions: ['箱', '个'],
      historyVisible: false, historyLoading: false, historyList: [], historyProductName: '', historyChart: null,
      query: { current: 1, size: 10, name: '', categoryId: null },
      form: { id: null, name: '', skuCode: '', categoryId: null, unit: '箱', price: 0, costPrice: 0, spec: '', barcode: '', weightPerBox: null, qtyPerBox: null, status: 1 },
      rules: { name: [{ required: true, message: '请输入商品名称' }], skuCode: [{ required: true, message: '请输入SKU' }], unit: [{ required: true, message: '请输入单位' }] }
    }
  },
  created() { this.loadData(); getCategories().then(r => { this.categories = r.data }) },
  beforeDestroy() { if (this.historyChart) { this.historyChart.dispose(); this.historyChart = null } },
  methods: {
    async loadData() {
      this.loading = true
      const res = await getProducts(this.query).finally(() => { this.loading = false })
      this.list = res.data.records; this.total = res.data.total
      const units = this.list.map(p => p.unit).filter(Boolean)
      this.unitOptions = Array.from(new Set(['箱', '个', ...units]))
    },
    openForm(row) {
      this.form = row ? { ...row } : { id: null, name: '', skuCode: '', categoryId: null, unit: '箱', price: 0, costPrice: 0, spec: '', barcode: '', weightPerBox: null, qtyPerBox: null, status: 1 }
      this.originalQtyPerBox = row ? row.qtyPerBox : null
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.id && this.originalQtyPerBox > 0 && this.form.qtyPerBox > 0 && this.form.qtyPerBox !== this.originalQtyPerBox) {
          try {
            await this.$confirm('每箱个数已修改，历史库存不会自动换算，如有偏差请通过盘点调整。确认保存？', '提示', { type: 'warning' })
          } catch {
            return
          }
        }
        this.saving = true
        try {
          if (this.form.id) await updateProduct(this.form.id, this.form)
          else await createProduct(this.form)
          this.$message.success('保存成功'); this.dialogVisible = false; this.loadData()
        } finally { this.saving = false }
      })
    },
    async openCostHistory(row) {
      this.historyProductName = row.name
      this.historyVisible = true
      this.historyLoading = true
      try {
        const res = await getProductCostHistory(row.id)
        this.historyList = (res.data || []).slice().reverse()
      } finally {
        this.historyLoading = false
        this.$nextTick(() => this.renderHistoryChart())
      }
    },
    renderHistoryChart() {
      if (!this.$refs.historyChart) return
      if (!this.historyChart) this.historyChart = echarts.init(this.$refs.historyChart)
      const dates = this.historyList.map(r => r.changedAt ? r.changedAt.slice(0, 10) : '')
      const prices = this.historyList.map(r => Number(r.newPrice))
      this.historyChart.setOption({
        tooltip: { trigger: 'axis', formatter: params => `${params[0].axisValue}<br/>均价：KSh ${params[0].value}` },
        grid: { left: '3%', right: '4%', top: '10%', bottom: '8%', containLabel: true },
        xAxis: { type: 'category', data: dates, axisLabel: { rotate: dates.length > 6 ? 30 : 0 } },
        yAxis: { type: 'value', name: 'KSh', scale: true },
        series: [{
          type: 'line', data: prices, smooth: false,
          symbol: 'circle', symbolSize: 6,
          itemStyle: { color: '#E6A23C' },
          lineStyle: { color: '#E6A23C', width: 2 },
          areaStyle: { color: 'rgba(230,162,60,0.08)' }
        }]
      }, true)
    },
    async handleDelete(id) {
      try {
        await this.$confirm('确认删除该商品？', '提示', { type: 'warning' })
      } catch {
        return
      }
      try {
        await deleteProduct(id)
        this.$message.success('删除成功')
        this.loadData()
      } catch {
        // 错误已由 axios 拦截器统一展示
      }
    }
  }
}
</script>
