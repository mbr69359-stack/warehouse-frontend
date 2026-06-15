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
    }
  }
}
