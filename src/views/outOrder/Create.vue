<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>{{ editId ? '编辑出库单' : '新建出库单' }}</span>
    </div>

    <el-alert v-if="pendingCount > 0"
      :title="`⚠ 当前有 ${pendingCount} 条损坏记录待处理，请及时处理`"
      type="warning" show-icon :closable="false" style="margin-bottom:16px;" />

    <el-form :model="form" :rules="currentRules" ref="form" label-width="100px" style="max-width:600px;">
      <el-form-item label="仓库" prop="warehouseId">
        <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width:100%;" @change="onWarehouseChange">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="出库类型" prop="type">
        <el-radio-group v-model="form.type" @change="onTypeChange">
          <el-radio label="SALE">销售出库</el-radio>
          <el-radio label="TRANSFER">调拨出库</el-radio>
          <el-radio label="DAMAGE_OUT">损坏出库</el-radio>
          <el-radio label="REPLACEMENT_OUT">补发出库</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.type === 'SALE'" label="销售渠道" prop="saleChannel">
        <el-select v-model="form.saleChannel" placeholder="请选择销售渠道" style="width:100%;">
          <el-option label="零售" value="RETAIL" />
          <el-option label="批发" value="WHOLESALE" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="form.type === 'TRANSFER'" label="目标仓库" prop="targetWarehouseId">
        <el-select v-model="form.targetWarehouseId" placeholder="请选择目标仓库" style="width:100%;">
          <el-option v-for="w in targetWarehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      <!-- 客户关联（可选，用于记录销售对象和参考价） -->
      <el-form-item label="客户">
        <el-select v-model="form.customerId" placeholder="选择客户（可选）" clearable filterable style="width:100%;">
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
    </el-form>

    <!-- 损坏出库：显示可勾选的损坏记录表格 -->
    <template v-if="form.type === 'DAMAGE_OUT'">
      <div style="margin:16px 0 8px;font-weight:bold;">待处理损坏记录</div>
      <el-tooltip :disabled="!!form.warehouseId" content="请先选择仓库" placement="top">
        <span style="display:inline-block;">
          <el-table ref="damageTable" :data="damageRecords" v-loading="damageLoading"
            border @selection-change="onDamageSelectionChange"
            style="pointer-events: none;" :style="{ pointerEvents: form.warehouseId ? 'auto' : 'none' }">
            <el-table-column type="selection" width="50" />
            <el-table-column prop="productName" label="商品名" min-width="160" show-overflow-tooltip />
            <el-table-column prop="qty" label="数量" width="80" align="center" />
            <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          </el-table>
        </span>
      </el-tooltip>
      <div v-if="form.warehouseId && damageRecords.length === 0 && !damageLoading"
        style="color:#909399;padding:12px 0;">该仓库暂无待处理损坏记录</div>
    </template>

    <!-- 销售出库 / 补发出库：正常添加商品区域 -->
    <template v-else>
      <div style="margin:16px 0 8px;font-weight:bold;">出库明细</div>
      <el-tooltip :disabled="!!form.warehouseId" content="请先选择仓库" placement="top">
        <span>
          <el-button type="primary" size="small" icon="el-icon-plus"
            @click="addItem" :disabled="!form.warehouseId" style="margin-bottom:12px;">
            添加商品
          </el-button>
        </span>
      </el-tooltip>
      <el-table :data="form.items" border>
        <el-table-column label="商品" min-width="260">
          <template slot-scope="{row}">
            <el-select v-model="row.productId" placeholder="输入名称搜索商品" filterable remote
              :remote-method="searchProducts" :loading="productLoading" style="width:100%;" @change="onProductChange(row)">
              <el-option v-for="p in products" :key="p.id"
                :label="productLabel(p)" :value="p.id"
                :disabled="(inventoryMap[p.id] || 0) === 0" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="可用库存" :width="isBoxMode ? 130 : 90" align="center">
          <template slot-scope="{row}">
            <template v-if="row.productId">
              <el-tooltip v-if="isBoxMode && !qtyPerBoxOf(row.productId)"
                content="该商品未设每箱数量，库存按箱计" placement="top">
                <span :style="row.qty >= maxQty(row.productId) ? 'color:#f56c6c;font-weight:bold;' : ''">
                  {{ stockText(row.productId) }} ⚠️
                </span>
              </el-tooltip>
              <span v-else :style="row.qty >= maxQty(row.productId) ? 'color:#f56c6c;font-weight:bold;' : ''">
                {{ stockText(row.productId) }}
              </span>
            </template>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column :label="isBoxMode ? '数量（箱）' : '数量'" width="130">
          <template slot-scope="{row}">
            <el-input-number v-model="row.qty" :min="1"
              :max="row.productId ? maxQty(row.productId) : undefined"
              size="small" style="width:100%;" />
          </template>
        </el-table-column>
        <el-table-column label="单价" width="160">
          <template slot-scope="{row}">
            <el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width:100%;" />
            <!-- 显示参考上次成交价提示 -->
            <div v-if="row._lastPriceTip" style="font-size:11px;color:#909399;margin-top:2px;">{{ row._lastPriceTip }}</div>
          </template>
        </el-table-column>
        <el-table-column label="预计重量" width="110">
          <template slot-scope="{row}">
            <span v-if="rowWeight(row) != null">{{ formatWeight(rowWeight(row)) }}</span>
            <span v-else style="color:#c0c4cc;">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template slot-scope="{$index}">
            <el-button type="danger" size="mini" icon="el-icon-delete" circle @click="form.items.splice($index, 1)" />
          </template>
        </el-table-column>
      </el-table>
      <div v-if="totalWeight > 0" style="margin-top:10px;text-align:right;color:#606266;font-size:13px;">
        预计出库总重量：<strong>{{ totalWeight.toFixed(1) }} kg</strong>
      </div>
    </template>

    <div style="margin-top:20px;">
      <el-button type="primary" :loading="saving" @click="handleSave">{{ editId ? '保存修改' : '保存草稿' }}</el-button>
      <el-button @click="$router.back()">取消</el-button>
    </div>
  </el-card>
</template>

<script>
import { createOutOrder, getOutOrder, getOutOrderItems, updateOutOrder } from '../../api/outOrder'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import { getInventory } from '../../api/inventory'
import { getPendingDamageRecords, getPendingCount } from '../../api/damageRecord'
import { getCustomers, getLastPrice } from '../../api/customer'
import { lineWeightKg, formatWeight } from '../../utils/unit'

export default {
  data() {
    return {
      saving: false,
      editId: null,
      // 客户列表（用于下拉选择）
      customers: [],
      customersLoading: false,
      warehouses: [],
      products: [],
      productLoading: false,
      inventoryMap: {},
      pendingCount: 0,
      damageRecords: [],
      damageLoading: false,
      selectedDamageIds: [],
      form: { warehouseId: null, targetWarehouseId: null, type: 'SALE', saleChannel: null, remark: '', customerId: null, items: [] },
      baseRules: {
        warehouseId: [{ required: true, message: '请选择仓库' }],
        type: [{ required: true, message: '请选择类型' }],
        saleChannel: [{ required: true, message: '请选择销售渠道', trigger: 'change' }]
      },
      transferRules: {
        warehouseId: [{ required: true, message: '请选择仓库' }],
        type: [{ required: true, message: '请选择类型' }],
        targetWarehouseId: [{ required: true, message: '请选择目标仓库', trigger: 'change' }]
      }
    }
  },
  computed: {
    currentRules() {
      if (this.form.type === 'TRANSFER') return this.transferRules
      if (this.form.type === 'SALE') return this.baseRules
      // 非SALE类型去掉saleChannel校验
      const { saleChannel, ...rest } = this.baseRules
      return rest
    },
    targetWarehouses() {
      return this.warehouses.filter(w => w.id !== this.form.warehouseId)
    },
    productMap() {
      return Object.fromEntries(this.products.map(p => [p.id, p]))
    },
    // BOX 仓且非损坏/补发出库时，数量按"箱"录入（与后端扣库存逻辑一致：
    // DAMAGE_OUT/REPLACEMENT_OUT 的数量后端按"个"处理，不做箱换算）
    isBoxMode() {
      const w = this.warehouses.find(wh => wh.id === this.form.warehouseId)
      return !!w && w.type === 'BOX'
        && this.form.type !== 'DAMAGE_OUT' && this.form.type !== 'REPLACEMENT_OUT'
    },
    totalWeight() {
      return this.form.items.reduce((sum, row) => {
        const w = this.rowWeight(row)
        return w != null ? sum + w : sum
      }, 0)
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    getCustomers({ current: 1, size: 200 }).then(r => { this.customers = r.data.records || [] })
    const id = this.$route.params.id
    if (id) { this.editId = Number(id); this.loadForEdit(this.editId) }
  },
  methods: {
    searchProducts(query) {
      if (!query) return
      this.productLoading = true
      getProducts({ current: 1, size: 20, name: query })
        .then(r => {
          const incoming = r.data.records
          const seen = new Set(this.products.map(p => p.id))
          this.products = [...this.products, ...incoming.filter(p => !seen.has(p.id))]
        })
        .finally(() => { this.productLoading = false })
    },
    onWarehouseChange(warehouseId) {
      this.form.items = []
      this.form.targetWarehouseId = null
      this.inventoryMap = {}
      this.products = []
      this.damageRecords = []
      this.selectedDamageIds = []
      this.pendingCount = 0
      if (!warehouseId) return
      getPendingCount(warehouseId).then(r => { this.pendingCount = r.data || 0 }).catch(() => {})
      this.loadAllInventory(warehouseId)
      if (this.form.type === 'DAMAGE_OUT') {
        this.loadDamageRecords(warehouseId)
      }
    },
    async loadAllInventory(warehouseId) {
      const size = 500
      let current = 1
      const map = {}
      while (true) {
        const r = await getInventory({ warehouseId, current, size })
        const records = r.data.records || r.data || []
        records.forEach(item => { map[item.productId] = item.qty })
        if (current * size >= (r.data.total || 0)) break
        current++
      }
      this.inventoryMap = map
    },
    onTypeChange(type) {
      this.form.targetWarehouseId = null
      this.form.saleChannel = null
      this.form.items = []
      this.damageRecords = []
      this.selectedDamageIds = []
      if (type === 'DAMAGE_OUT' && this.form.warehouseId) {
        this.loadDamageRecords(this.form.warehouseId)
      }
    },
    loadDamageRecords(warehouseId) {
      this.damageLoading = true
      getPendingDamageRecords(warehouseId)
        .then(r => { this.damageRecords = r.data || [] })
        .finally(() => { this.damageLoading = false })
    },
    onDamageSelectionChange(rows) {
      this.selectedDamageIds = rows.map(r => r.id)
    },
    // 商品已设每箱数量（>0）则返回该值，否则返回 null
    qtyPerBoxOf(productId) {
      const p = this.productMap[productId]
      return p && p.qtyPerBox > 0 ? p.qtyPerBox : null
    },
    // 可用库存展示文案：BOX 仓按箱展示，PIECE 仓按个展示
    stockText(productId) {
      const qty = this.inventoryMap[productId] || 0
      if (!this.isBoxMode) return qty
      const qpb = this.qtyPerBoxOf(productId)
      if (!qpb) return `${qty}箱`
      return `${Math.floor(qty / qpb)}箱（${qty}个）`
    },
    // 数量输入上限：BOX 仓且已设每箱数量时换算为箱数，否则为原始数
    maxQty(productId) {
      const qty = this.inventoryMap[productId] || 0
      if (!this.isBoxMode) return qty
      const qpb = this.qtyPerBoxOf(productId)
      return qpb ? Math.floor(qty / qpb) : qty
    },
    productLabel(p) {
      const raw = this.inventoryMap[p.id]
      if (this.isBoxMode && raw !== undefined) {
        const qpb = p.qtyPerBox > 0 ? p.qtyPerBox : null
        if (!qpb) return `${p.name}(${p.skuCode}) — 库存:${raw}箱⚠️`
        return `${p.name}(${p.skuCode}) — 库存:${Math.floor(raw / qpb)}箱(${raw}个)`
      }
      const stock = raw !== undefined ? raw : '—'
      return `${p.name}(${p.skuCode}) — 库存:${stock}件`
    },
    addItem() { this.form.items.push({ productId: null, qty: 1, price: 0, _lastPriceTip: null }) },
    formatWeight,
    // isBoxMode 时数量按箱计重，否则按个换算（含补发出库、PIECE 仓）；未选仓库时不显示
    rowWeight(row) {
      if (!this.form.warehouseId) return null
      const p = this.productMap[row.productId]
      if (!p) return null
      return lineWeightKg(row.qty, p.weightPerBox, p.qtyPerBox, this.isBoxMode)
    },
    onProductChange(row) {
      const max = this.maxQty(row.productId)
      if (row.qty > max) row.qty = max
      // 选择商品后自动拉取参考价
      this.fetchLastPrice(row)
    },
    // 异步查询该客户对该商品的最近一次成交价，填入参考价提示
    async fetchLastPrice(row) {
      if (!this.form.customerId || !row.productId) return
      const r = await getLastPrice(this.form.customerId, row.productId)
      const price = r.data
      if (price != null) {
        row.price = Number(price)
        row._lastPriceTip = `参考上次：KSh ${Number(price).toFixed(2)}`
      } else {
        row._lastPriceTip = null
      }
    },
    async loadForEdit(id) {
      // 预载商品列表，保证明细里已选商品能在远程下拉中显示名称/库存/箱规
      const pr = await getProducts({ current: 1, size: 1000 })
      this.products = pr.data.records || []
      const r = await getOutOrder(id)
      const o = r.data
      this.form.warehouseId = o.warehouseId
      this.form.type = o.type
      this.form.saleChannel = o.saleChannel || null
      this.form.targetWarehouseId = o.targetWarehouseId || null
      this.form.remark = o.remark || ''
      this.form.customerId = o.customerId || null
      await this.loadAllInventory(o.warehouseId)
      const ir = await getOutOrderItems(id)
      this.form.items = (ir.data || []).map(it => ({
        productId: it.productId, qty: it.qty, price: it.price, _lastPriceTip: null
      }))
    },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return

        if (this.form.type === 'DAMAGE_OUT') {
          if (this.selectedDamageIds.length === 0) {
            this.$message.warning('请至少勾选一条损坏记录')
            return
          }
          this.saving = true
          try {
            await createOutOrder({ ...this.form, damageRecordIds: this.selectedDamageIds })
            this.$message.success('出库单创建成功')
            this.$router.push('/out-orders')
          } finally {
            this.saving = false
          }
          return
        }

        if (this.form.items.length === 0) {
          this.$message.warning('请至少添加一条出库明细')
          return
        }
        const emptyItem = this.form.items.find(i => !i.productId)
        if (emptyItem) {
          this.$message.warning('存在未选择商品的明细行，请补充或删除')
          return
        }
        if (this.form.type !== 'REPLACEMENT_OUT') {
          const overItem = this.form.items.find(i => i.qty > this.maxQty(i.productId))
          if (overItem) {
            const prod = this.products.find(p => p.id === overItem.productId)
            const avail = this.maxQty(overItem.productId)
            const unit = this.isBoxMode ? '箱' : '件'
            this.$message.error(`商品「${prod ? prod.name : overItem.productId}」库存仅剩 ${avail} ${unit}，出库数量不能超过库存`)
            return
          }
        }
        this.saving = true
        try {
          if (this.editId) {
            await updateOutOrder(this.editId, this.form)
            this.$message.success('出库单修改成功')
          } else {
            await createOutOrder(this.form)
            this.$message.success('出库单创建成功')
          }
          this.$router.push('/out-orders')
        } finally {
          this.saving = false
        }
      })
    }
  }
}
</script>
