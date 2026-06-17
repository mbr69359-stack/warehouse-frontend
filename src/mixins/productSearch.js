import { getProducts } from '../api/product'

// 商品远程搜索：多个含商品明细的页面共用。
// 依赖组件自身 data 提供 products: [] 与 productLoading: false。
export default {
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
    // 商品标题：名字 / 分类 / 规格 (SKU)，用于区分同名商品。
    // 分类、规格缺省时自动省略；categoryName 由后端列表接口返回。
    productTitle(p) {
      if (!p) return ''
      const parts = [p.name]
      if (p.categoryName) parts.push(p.categoryName)
      if (p.spec) parts.push(p.spec)
      return `${parts.join(' / ')} (${p.skuCode})`
    },
    // 下拉默认标签；需要附带库存等信息的页面可自定义 productLabel 并复用 productTitle
    productLabel(p) {
      return this.productTitle(p)
    }
  }
}
