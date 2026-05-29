import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

function getDeviceId() {
  let id = localStorage.getItem('deviceId')
  if (!id) {
    id = btoa([navigator.userAgent, screen.width + 'x' + screen.height, navigator.language].join('|'))
    localStorage.setItem('deviceId', id)
  }
  return id
}

function loadToken() {
  const deviceId = getDeviceId()
  const saved = localStorage.getItem('savedDeviceId')
  // 记住我：检查设备是否一致
  if (saved && saved === deviceId) {
    return localStorage.getItem('token') || ''
  }
  // 非记住我：用 sessionStorage
  return sessionStorage.getItem('token') || ''
}

export default new Vuex.Store({
  state: {
    token: loadToken(),
    user: JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null'),
    roles: JSON.parse(sessionStorage.getItem('roles') || localStorage.getItem('roles') || '[]')
  },
  mutations: {
    SET_TOKEN(state, { token, remember }) {
      state.token = token
      if (remember) {
        localStorage.setItem('token', token)
        localStorage.setItem('savedDeviceId', getDeviceId())
      } else {
        sessionStorage.setItem('token', token)
        localStorage.removeItem('token')
        localStorage.removeItem('savedDeviceId')
      }
    },
    SET_USER(state, user) {
      state.user = user
      sessionStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('user', JSON.stringify(user))
    },
    SET_ROLES(state, roles) {
      state.roles = roles
      sessionStorage.setItem('roles', JSON.stringify(roles))
      localStorage.setItem('roles', JSON.stringify(roles))
    },
    LOGOUT(state) {
      state.token = ''; state.user = null; state.roles = []
      localStorage.removeItem('token'); localStorage.removeItem('savedDeviceId')
      localStorage.removeItem('user'); localStorage.removeItem('roles')
      sessionStorage.clear()
    }
  },
  getters: {
    isLoggedIn: state => !!state.token,
    isAdmin: state => state.roles.includes('ADMIN'),
    username: state => state.user ? state.user.username : ''
  }
})