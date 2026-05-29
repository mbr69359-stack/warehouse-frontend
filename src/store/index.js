import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    roles: JSON.parse(localStorage.getItem('roles') || '[]')
  },
  mutations: {
    SET_TOKEN(state, token) { state.token = token; localStorage.setItem('token', token) },
    SET_USER(state, user) { state.user = user; localStorage.setItem('user', JSON.stringify(user)) },
    SET_ROLES(state, roles) { state.roles = roles; localStorage.setItem('roles', JSON.stringify(roles)) },
    LOGOUT(state) {
      state.token = ''; state.user = null; state.roles = []
      localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('roles')
    }
  },
  getters: {
    isLoggedIn: state => !!state.token,
    isAdmin: state => state.roles.includes('ADMIN'),
    username: state => state.user ? state.user.username : ''
  }
})
