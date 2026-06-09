import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './assets/mobile.css'
import App from './App.vue'
import router from './router'
import store from './store'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    if (regs.length > 0) {
      Promise.all(regs.map(r => r.unregister())).then(() => {
        window.location.reload()
      })
    }
  })
}

Vue.use(ElementUI)
Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
