<template>
  <el-container style="height:100vh;">
    <!-- 桌面端侧边栏（移动端隐藏） -->
    <el-aside
      v-if="!isMobile"
      :width="collapsed ? '64px' : '220px'"
      style="background:#304156;transition:width .3s;overflow:hidden;"
    >
      <div class="logo" @click="$router.push('/dashboard')">
        <i class="el-icon-s-grid" style="color:#409EFF;font-size:22px;"></i>
        <span v-show="!collapsed" style="color:#fff;margin-left:8px;font-weight:bold;white-space:nowrap;">仓库管理系统</span>
      </div>
      <Sidebar :collapsed="collapsed" />
    </el-aside>

    <el-container style="overflow:hidden;">
      <!-- 顶部 Header -->
      <el-header style="background:#fff;border-bottom:1px solid #e6e6e6;padding:0 20px;display:flex;align-items:center;">
        <Header :is-mobile="isMobile" @toggle="collapsed=!collapsed" />
      </el-header>

      <!-- 主内容区 -->
      <el-main :style="mainStyle">
        <router-view />
      </el-main>

      <!-- 移动端底部导航 -->
      <div v-if="isMobile" class="mobile-bottom-nav">
        <div
          v-for="tab in navTabs"
          :key="tab.key"
          class="mobile-nav-item"
          :class="{ active: isTabActive(tab) }"
          @click="handleNavClick(tab)"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </div>
      </div>
    </el-container>
  </el-container>
</template>

<script>
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import { logout } from '../../api/auth'

export default {
  components: { Sidebar, Header },
  data() {
    return {
      collapsed: false,
      windowWidth: window.innerWidth,
      navTabs: [
        { key: 'dashboard', label: '首页',  icon: 'el-icon-s-home',         routes: ['/dashboard'] },
        { key: 'inventory', label: '库存',  icon: 'el-icon-s-grid',         routes: ['/inventory'] },
        { key: 'orders',    label: '出入库', icon: 'el-icon-sort',           routes: ['/in-orders', '/out-orders'] },
        { key: 'report',    label: '报表',  icon: 'el-icon-data-analysis',  routes: ['/report'] },
        { key: 'mine',      label: '我的',  icon: 'el-icon-user',           routes: [] }
      ]
    }
  },
  computed: {
    isMobile() {
      return this.windowWidth <= 768
    },
    mainStyle() {
      return {
        background: '#f0f2f5',
        padding: '20px',
        overflowY: 'auto',
        paddingBottom: this.isMobile ? '72px' : '20px'
      }
    }
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    onResize() {
      this.windowWidth = window.innerWidth
    },
    isTabActive(tab) {
      if (tab.key === 'mine') return false
      const path = this.$route.path
      return tab.routes.some(r => path === r || path.startsWith(r + '/'))
    },
    handleNavClick(tab) {
      if (tab.key === 'mine') {
        this.$confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '退出',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          await logout().catch(() => {})
          this.$store.commit('LOGOUT')
          this.$router.push('/login')
        }).catch(() => {})
        return
      }
      const target = tab.routes[0]
      if (this.$route.path !== target) {
        this.$router.push(target)
      }
    }
  }
}
</script>

<style scoped>
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid #3a4a5c;
  padding: 0 12px;
}

.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  display: flex;
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.mobile-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  color: #aaa;
  font-size: 10px;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.mobile-nav-item i {
  font-size: 20px;
}

.mobile-nav-item.active {
  color: #409EFF;
}
</style>
