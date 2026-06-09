import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '../store'

Vue.use(VueRouter)

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../components/Layout/index.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'products', component: () => import('../views/product/List.vue') },
      { path: 'categories', component: () => import('../views/product/Category.vue') },
      { path: 'warehouses', component: () => import('../views/warehouse/List.vue') },
      { path: 'suppliers', component: () => import('../views/supplier/List.vue') },
      { path: 'customers', component: () => import('../views/customer/List.vue') },
      { path: 'customers/:id', component: () => import('../views/customer/Detail.vue') },
      { path: 'in-orders', component: () => import('../views/inOrder/List.vue') },
      { path: 'in-orders/create', component: () => import('../views/inOrder/Create.vue') },
      { path: 'in-orders/:id', component: () => import('../views/inOrder/Detail.vue') },
      { path: 'out-orders', component: () => import('../views/outOrder/List.vue') },
      { path: 'out-orders/create', component: () => import('../views/outOrder/Create.vue') },
      { path: 'out-orders/:id', component: () => import('../views/outOrder/Detail.vue') },
      { path: 'inventory', component: () => import('../views/inventory/List.vue') },
      { path: 'inventory/alerts', component: () => import('../views/inventory/Alerts.vue') },
      { path: 'inventory/check', component: () => import('../views/inventory/Check.vue') },
      { path: 'inventory/ledger', component: () => import('../views/inventory/Ledger.vue') },
      { path: 'report/in', component: () => import('../views/report/In.vue') },
      { path: 'report/out', component: () => import('../views/report/Out.vue') },
      { path: 'report/inventory', component: () => import('../views/report/Inventory.vue') },
      { path: 'report/ledger', component: () => import('../views/report/Ledger.vue') },
      { path: 'report/stock-movement', component: () => import('../views/report/StockMovement.vue') },
      { path: 'report/supplier', component: () => import('../views/report/Supplier.vue') },
      { path: 'report/customer', component: () => import('../views/report/Customer.vue') },
      { path: 'report/stocktake', component: () => import('../views/report/Stocktake.vue') },
      { path: 'report/gross-profit', component: () => import('../views/report/GrossProfit.vue') },
      { path: 'report/product-profit', component: () => import('../views/report/ProductProfit.vue') },
      { path: 'report/damage', component: () => import('../views/report/Damage.vue') },
      { path: 'report/cost-history', component: () => import('../views/report/CostHistory.vue') },
      { path: 'expenses', component: () => import('../views/expense/List.vue') },
      { path: 'sys/users', component: () => import('../views/sys/Users.vue'), meta: { adminOnly: true } },
      { path: 'sys/roles', component: () => import('../views/sys/Roles.vue'), meta: { adminOnly: true } },
      { path: 'sys/config', component: () => import('../views/sys/Config.vue'), meta: { adminOnly: true } },
      { path: 'damage', component: () => import('../views/damage/Index.vue') },
      { path: 'damage-records', component: () => import('../views/damage/Index.vue') },
      { path: 'customer-returns', component: () => import('../views/customerReturn/Index.vue') },
      { path: 'quick-entry', component: () => import('../views/offline/QuickEntry.vue') },
      { path: 'sync/pending', component: () => import('../views/sync/PendingLogs.vue') }
    ]
  },
  { path: '*', redirect: '/dashboard' }
]

const router = new VueRouter({ routes })

router.beforeEach((to, from, next) => {
  if (to.meta.public) return next()
  if (!store.getters.isLoggedIn) return next('/login')
  if (to.meta.adminOnly && !store.getters.isAdmin) return next('/dashboard')
  next()
})

export default router
