<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-title">
        <i class="el-icon-s-grid" style="color:#409EFF;font-size:36px;"></i>
        <h2>仓库管理系统</h2>
      </div>
      <el-form :model="form" :rules="rules" ref="form" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" prefix-icon="el-icon-user" @keyup.enter.native="handleLogin" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" prefix-icon="el-icon-lock" show-password @keyup.enter.native="handleLogin" />
        </el-form-item>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <el-checkbox v-model="rememberMe">记住此设备，下次自动登录</el-checkbox>
        </div>
        <el-button type="primary" style="width:100%;" :loading="loading" @click="handleLogin">登 录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { login } from '../api/auth'
export default {
  data() {
    return {
      loading: false,
      rememberMe: false,
      form: { username: '', password: '' },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    }
  },
  methods: {
    handleLogin() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.loading = true
        try {
          const res = await login(this.form)
          this.$store.commit('SET_TOKEN', { token: res.data.token, remember: this.rememberMe })
          this.$store.commit('SET_USER', { username: res.data.username, realName: res.data.realName })
          this.$store.commit('SET_ROLES', res.data.roles)
          this.$router.push('/')
        } finally { this.loading = false }
      })
    }
  }
}
</script>

<style scoped>
.login-container { height:100vh;background:linear-gradient(135deg,#1e3a5f 0%,#409EFF 100%);display:flex;align-items:center;justify-content:center; }
.login-card { width:400px;border-radius:8px; }
.login-title { text-align:center;margin-bottom:24px; }
.login-title h2 { margin-top:8px;color:#303133; }
</style>