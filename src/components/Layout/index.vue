<template>
  <el-container style="height:100vh;">
    <!-- 桌面端侧边栏（移动端隐藏） -->
    <el-aside
      v-if="!isMobile"
      :width="collapsed ? '64px' : '220px'"
      style="background:#304156;transition:width .3s;overflow-x:hidden;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;"
    >
      <div class="logo" @click="$router.push('/dashboard')">
        <i class="el-icon-s-grid" style="color:#409EFF;font-size:22px;"></i>
        <span v-show="!collapsed" style="color:#fff;margin-left:8px;font-weight:bold;white-space:nowrap;">仓库管理系统</span>
      </div>
      <Sidebar :collapsed="collapsed" />
    </el-aside>

    <el-container style="overflow:hidden;">
      <!-- 顶部 Header -->
      <el-header
        :height="isMobile ? '48px' : '60px'"
        :style="isMobile
          ? 'background:#f8f9ff;border-bottom:1px solid #c4c5d5;padding:0 16px;display:flex;align-items:center;'
          : 'background:#fff;border-bottom:1px solid #e6e6e6;padding:0 20px;display:flex;align-items:center;'"
      >
        <Header :is-mobile="isMobile" @toggle="collapsed=!collapsed" />
      </el-header>

      <!-- 主内容区 -->
      <el-main :style="mainStyle">
        <router-view />
      </el-main>

      <!-- 移动端底部导航 -->
      <nav v-if="isMobile" class="mobile-bottom-nav">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="mobile-nav-item"
          :class="{ active: isTabActive(tab) }"
          @click="handleNavClick(tab)"
        >
          <span
            class="material-symbols-outlined nav-icon"
            :style="isTabActive(tab) ? 'font-variation-settings:\'FILL\' 1,\'wght\' 400,\'GRAD\' 0,\'opsz\' 24;' : 'font-variation-settings:\'FILL\' 0,\'wght\' 400,\'GRAD\' 0,\'opsz\' 24;'"
          >{{ tab.icon }}</span>
          <span class="nav-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- 我的 底部抽屉 -->
      <transition name="sheet">
        <div v-if="showMineSheet" class="mine-overlay" @click="showMineSheet=false">
          <div class="mine-sheet" @click.stop>
            <div class="mine-handle"></div>
            <div class="mine-user-info">
              <div class="mine-avatar">
                <span class="material-symbols-outlined" style="font-size:36px;color:#00288e;">person</span>
              </div>
              <div>
                <div class="mine-username">{{ username }}</div>
                <div class="mine-role">仓库管理员</div>
              </div>
            </div>
            <div class="mine-divider"></div>
            <button class="mine-logout-btn" @click="doLogout">
              <span class="material-symbols-outlined">logout</span>
              退出登录
            </button>
          </div>
        </div>
      </transition>
    </el-container>
  </el-container>
</template>

<script>
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import { mapGetters } from 'vuex'
import { logout } from '../../api/auth'

export default {
  components: { Sidebar, Header },
  data() {
    return {
      collapsed: false,
      windowWidth: window.innerWidth,
      showMineSheet: false,
      navTabs: [
        { key: 'dashboard', label: '工作台', icon: 'dashboard',   routes: ['/dashboard'] },
        { key: 'inorder',   label: '入库',   icon: 'input',       routes: ['/in-orders'] },
        { key: 'outorder',  label: '出库',   icon: 'output',      routes: ['/out-orders'] },
        { key: 'inventory', label: '库存',   icon: 'inventory_2', routes: ['/inventory'] },
        { key: 'mine',      label: '我的',   icon: 'person',      routes: [] }
      ]
    }
  },
  computed: {
    ...mapGetters(['username']),
    isMobile() {
      return this.windowWidth <= 768
    },
    mainStyle() {
      return {
        background: this.isMobile ? '#f0f2f5' : '#f0f2f5',
        padding: this.isMobile ? '12px 12px 0 12px' : '20px',
        overflowY: 'auto',
        paddingBottom: this.isMobile ? '80px' : '20px'
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
      if (tab.key === 'mine') return this.showMineSheet
      const path = this.$route.path
      return tab.routes.some(r => path === r || path.startsWith(r + '/'))
    },
    handleNavClick(tab) {
      if (tab.key === 'mine') {
        this.showMineSheet = !this.showMineSheet
        return
      }
      this.showMineSheet = false
      const target = tab.routes[0]
      if (this.$route.path !== target) {
        this.$router.push(target)
      }
    },
    async doLogout() {
      this.showMineSheet = false
      await logout().catch(() => {})
      this.$store.commit('LOGOUT')
      this.$router.push('/login')
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

/* ── 底部导航 ── */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #f8f9ff;
  border-top: 1px solid #c4c5d5;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
  padding: 0 4px;
}

.mobile-nav-item {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  color: #757684;
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 10px;
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.mobile-nav-item:active {
  background: rgba(0, 40, 142, 0.08);
  transform: scale(0.95);
  transition: transform 0.1s;
}

.mobile-nav-item.active {
  color: #00288e;
}

.nav-icon {
  font-size: 24px;
  line-height: 1;
  display: inline-block;
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.3;
  font-family: 'Inter', -apple-system, sans-serif;
}

/* ── 我的抽屉 ── */
.mine-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
}

.mine-sheet {
  width: 100%;
  background: #f8f9ff;
  border-radius: 20px 20px 0 0;
  padding: 8px 20px 40px;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
}

.mine-handle {
  width: 36px;
  height: 4px;
  background: #c4c5d5;
  border-radius: 2px;
  margin: 0 auto 20px;
}

.mine-user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0 12px;
}

.mine-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #e6eeff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mine-username {
  font-size: 18px;
  font-weight: 700;
  color: #121c2a;
}

.mine-role {
  font-size: 12px;
  color: #757684;
  margin-top: 4px;
}

.mine-divider {
  height: 1px;
  background: #c4c5d5;
  margin: 8px 0 16px;
}

.mine-logout-btn {
  width: 100%;
  height: 48px;
  border: 2px solid #ba1a1a;
  color: #ba1a1a;
  background: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s, transform 0.1s;
}

.mine-logout-btn:active {
  opacity: 0.7;
  transform: scale(0.98);
}

/* ── 抽屉动画 ── */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s;
}
.sheet-enter,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter .mine-sheet,
.sheet-leave-to .mine-sheet {
  transform: translateY(100%);
}
.sheet-enter-active .mine-sheet,
.sheet-leave-active .mine-sheet {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
