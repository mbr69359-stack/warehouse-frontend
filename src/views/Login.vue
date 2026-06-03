<template>
  <div class="login-container" :class="{ mobile: isMobile }">

    <!-- ── 桌面端 ── -->
    <el-card v-if="!isMobile" class="login-card">
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
        <div style="margin-bottom:16px;">
          <el-checkbox v-model="rememberMe">记住此设备，下次自动登录</el-checkbox>
        </div>
        <el-button type="primary" style="width:100%;" :loading="loading" @click="handleLogin">登 录</el-button>
      </el-form>
    </el-card>

    <!-- ── 移动端 ── -->
    <div v-else class="ml-card">
      <header class="ml-header">
        <div class="ml-logo">
          <span class="material-symbols-outlined" style="font-size:40px;color:#a8b8ff;">warehouse</span>
        </div>
        <h1 class="ml-title">仓库管理系统</h1>
        <p class="ml-sub">INDUSTRIAL PRECISION</p>
      </header>

      <form class="ml-form" @submit.prevent="handleLogin">
        <div class="ml-field">
          <label class="ml-label">
            <span class="material-symbols-outlined" style="font-size:16px;">person</span>
            员工 ID / 用户名
          </label>
          <input v-model="form.username" class="ml-input" type="text" placeholder="请输入您的 ID" />
        </div>

        <div class="ml-field">
          <label class="ml-label">
            <span class="material-symbols-outlined" style="font-size:16px;">lock</span>
            密码
          </label>
          <div class="ml-input-wrap">
            <input v-model="form.password" class="ml-input" :type="showPwd?'text':'password'" placeholder="请输入密码" />
            <button type="button" class="ml-eye" @click="showPwd=!showPwd">
              <span class="material-symbols-outlined" style="font-size:20px;color:#757684;">{{ showPwd?'visibility_off':'visibility' }}</span>
            </button>
          </div>
        </div>

        <div class="ml-remember-row">
          <label class="ml-toggle-label" @click="rememberMe=!rememberMe">
            <div class="ml-toggle" :class="{on:rememberMe}">
              <div class="ml-knob"></div>
            </div>
            <span>记住我</span>
          </label>
        </div>

        <button type="submit" class="ml-btn" :disabled="loading">
          <span v-if="loading" class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span>
          <template v-else>
            <span>登 录</span>
            <span class="material-symbols-outlined">login</span>
          </template>
        </button>
      </form>

      <footer class="ml-footer">
        <div class="ml-badges">
          <span class="ml-badge"><span class="material-symbols-outlined" style="font-size:14px;">verified_user</span> 安全连接</span>
        </div>
        <div class="ml-status">
          <span class="ml-dot"></span>
          <span>系统运行正常</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<script>
import { login } from '../api/auth'
import mobileMixin from '../mixins/mobile'
export default {
  mixins: [mobileMixin],
  data() {
    return {
      loading: false,
      rememberMe: false,
      showPwd: false,
      form: { username: '', password: '' },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    }
  },
  methods: {
    handleLogin() {
      if (this.isMobile) {
        if (!this.form.username) { this.$message.error('请输入用户名'); return }
        if (!this.form.password) { this.$message.error('请输入密码'); return }
        this._doLogin()
        return
      }
      this.$refs.form.validate(valid => { if (valid) this._doLogin() })
    },
    async _doLogin() {
      this.loading = true
      try {
        const res = await login(this.form)
        this.$store.commit('SET_TOKEN', { token: res.data.token, remember: this.rememberMe })
        this.$store.commit('SET_USER', { username: res.data.username, realName: res.data.realName })
        this.$store.commit('SET_ROLES', res.data.roles)
        const redirect = this.$route.query.redirect || '/'
        this.$router.push(redirect)
      } catch (e) {
        this.$message.error('用户名或密码错误')
      } finally { this.loading = false }
    }
  }
}
</script>

<style scoped>
/* 公共 */
.login-container {
  height: 100vh;
  background: linear-gradient(135deg, #1e3a5f 0%, #409EFF 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-container.mobile {
  background: #f8f9ff;
  padding: 24px 16px;
}
.login-card { width: 400px; border-radius: 8px; }
.login-title { text-align: center; margin-bottom: 24px; }
.login-title h2 { margin-top: 8px; color: #303133; }

/* 移动端卡片 */
.ml-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border: 1px solid #c4c5d5;
  border-radius: 8px;
  padding: 32px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.ml-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 28px;
}
.ml-logo {
  width: 64px; height: 64px;
  background: #1e40af;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.ml-title { font-size: 20px; font-weight: 700; color: #00288e; margin: 0; }
.ml-sub   { font-size: 11px; color: #757684; letter-spacing: 0.1em; margin: 0; }

.ml-form  { display: flex; flex-direction: column; gap: 18px; }
.ml-field { display: flex; flex-direction: column; gap: 6px; }
.ml-label {
  font-size: 13px; font-weight: 600; color: #444653;
  display: flex; align-items: center; gap: 6px;
}
.ml-input {
  height: 48px; width: 100%;
  padding: 0 44px 0 14px;
  border: 1px solid #757684; border-radius: 4px;
  font-size: 16px; color: #121c2a; background: #fff;
  outline: none; box-sizing: border-box;
  transition: border-color .2s, box-shadow .2s;
}
.ml-input:focus { border-color: #00288e; box-shadow: 0 0 0 1px #00288e; }
.ml-input-wrap { position: relative; }
.ml-eye {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; padding: 0;
  display: flex; align-items: center;
}
.ml-remember-row { display: flex; align-items: center; }
.ml-toggle-label { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #757684; cursor: pointer; }
.ml-toggle {
  width: 40px; height: 20px; background: #c4c5d5;
  border-radius: 10px; position: relative; transition: background .2s;
}
.ml-toggle.on { background: #00288e; }
.ml-knob {
  position: absolute; left: 2px; top: 2px;
  width: 16px; height: 16px; background: #fff;
  border-radius: 50%; transition: transform .2s;
}
.ml-toggle.on .ml-knob { transform: translateX(20px); }

.ml-btn {
  height: 48px; background: #00288e; color: #fff;
  border: none; border-radius: 10px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 2px 10px rgba(0,40,142,0.35);
  transition: opacity .15s, transform .1s;
  -webkit-tap-highlight-color: transparent;
}
.ml-btn:active { opacity: .85; transform: scale(.98); }
.ml-btn:disabled { opacity: .7; }

.ml-footer {
  margin-top: 24px; padding-top: 20px;
  border-top: 1px solid #c4c5d5;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.ml-badges { display: flex; gap: 20px; }
.ml-badge  {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #444653;
}
.ml-status {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 12px; background: rgba(0,61,39,.08);
  border-radius: 20px; font-size: 11px; color: #003d27;
}
.ml-dot {
  width: 8px; height: 8px; background: #003d27;
  border-radius: 50%; animation: pulse 2s infinite;
}
</style>