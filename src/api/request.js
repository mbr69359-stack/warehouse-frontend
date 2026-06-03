import axios from 'axios'
import { Message } from 'element-ui'
import router from '../router'
import store from '../store'

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

const request = axios.create({ baseURL: process.env.VUE_APP_API_BASE || '/api', timeout: 15000 })

request.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers['Authorization'] = 'Bearer ' + token
  return config
})

function handleUnauthorized() {
  store.commit('LOGOUT')
  const current = router.currentRoute
  if (current.path !== '/login') {
    router.push({ path: '/login', query: { redirect: current.fullPath } })
  }
}

request.interceptors.response.use(
  res => {
    const data = res.data
    if (data.code === 401) {
      handleUnauthorized()
      return Promise.reject(new Error('登录已过期'))
    }
    if (data.code !== 200) {
      Message.error(data.message || '操作失败')
      return Promise.reject(new Error(data.message))
    }
    return data
  },
  err => {
    if (err.response && err.response.status === 401) {
      handleUnauthorized()
      return Promise.reject(new Error('登录已过期'))
    }
    Message.error(err.message || '网络错误')
    return Promise.reject(err)
  }
)

export default request
