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
      <el-table-column prop="skuCode" label="SKU编码" width="140" />
      <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
      <el-table-column prop="barcode" label="条码" width="130" show-overflow-tooltip />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="price" label="价格" width="100"><template slot-scope="{row}">¥{{ row.price }}</template></el-table-column>
      <el-table-column label="箱规" width="140" show-overflow-tooltip>
        <template slot-scope="{row}">
          <span v-if="row.weightPerBox || row.qtyPerBox">
            {{ row.weightPerBox ? row.weightPerBox + 'kg' : '—' }} / {{ row.qtyPerBox ? row.qtyPerBox + '片' : '—' }}
          </span>
          <span v-else style="color:#c0c4cc;">未设置</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template slot-scope="{row}"><el-tag :type="row.status===1?'success':'info'">{{ row.status===1?'上架':'下架' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" @click="openForm(row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, sizes, prev, pager, next"
      :total="total" :page-size="query.size" :current-page="query.current"
      @current-change="p=>{query.current=p;loadData()}" @size-change="s=>{query.size=s;loadData()}" />

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
        <el-form-item label="单位" prop="unit"><el-input v-model="form.unit" /></el-form-item>
        <el-form-item label="价格" prop="price"><el-input-number v-model="form.price" :precision="2" :min="0" style="width:100%;" /></el-form-item>
        <el-form-item label="每箱重量(kg)"><el-input-number v-model="form.weightPerBox" :precision="2" :min="0" :placeholder="null" style="width:100%;" /></el-form-item>
        <el-form-item label="每箱片数"><el-input-number v-model="form.qtyPerBox" :min="0" :precision="0" :placeholder="null" style="width:100%;" /></el-form-item>
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
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../api/product'
import { getCategories } from '../../api/category'
export default {
  data() {
    return {
      list: [], total: 0, loading: false, saving: false, dialogVisible: false, categories: [],
      query: { current: 1, size: 10, name: '', categoryId: null },
      form: { id: null, name: '', skuCode: '', categoryId: null, unit: '个', price: 0, spec: '', barcode: '', weightPerBox: null, qtyPerBox: null, status: 1 },
      rules: { name: [{ required: true, message: '请输入商品名称' }], skuCode: [{ required: true, message: '请输入SKU' }], unit: [{ required: true, message: '请输入单位' }] }
    }
  },
  created() { this.loadData(); getCategories().then(r => { this.categories = r.data }) },
  methods: {
    async loadData() {
      this.loading = true
      const res = await getProducts(this.query).finally(() => { this.loading = false })
      this.list = res.data.records; this.total = res.data.total
    },
    openForm(row) {
      this.form = row ? { ...row } : { id: null, name: '', skuCode: '', categoryId: null, unit: '个', price: 0, spec: '', barcode: '', weightPerBox: null, qtyPerBox: null, status: 1 }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          if (this.form.id) await updateProduct(this.form.id, this.form)
          else await createProduct(this.form)
          this.$message.success('保存成功'); this.dialogVisible = false; this.loadData()
        } finally { this.saving = false }
      })
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
