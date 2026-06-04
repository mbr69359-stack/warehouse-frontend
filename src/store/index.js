import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

function isTokenExpired(token) {
  try {
    const exp = JSON.parse(atob(token.split('.')[1])).exp
    return exp ? Date.now() >= exp * 1000 : false
  } catch {
    return true
  }
}

function loadToken() {
  let token
  if (localStorage.getItem('remember_me') === '1') {
    token = localStorage.getItem('token') || ''
  } else {
    token = sessionStorage.getItem('token') || ''
  }
  if (token && isTokenExpired(token)) {
    localStorage.removeItem('token')
    localStorage.removeItem('remember_me')
    sessionStorage.removeItem('token')
    return ''
  }
  return token
}

export default new Vuex.Store({
  state: {
    token: loadToken(),
    user: JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'),
    roles: JSON.parse(localStorage.getItem('roles') || sessionStorage.getItem('roles') || '[]')
  },
  mutations: {
    SET_TOKEN(state, { token, remember }) {
      state.token = token
      if (remember) {
        localStorage.setItem('token', token)
        localStorage.setItem('remember_me', '1')
        sessionStorage.removeItem('token')
      } else {
        sessionStorage.setItem('token', token)
        localStorage.removeItem('token')
        localStorage.removeItem('remember_me')
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
      localStorage.removeItem('token'); localStorage.removeItem('remember_me')
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