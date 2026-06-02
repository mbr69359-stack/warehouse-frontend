<template>
  <div style="width:100%;display:flex;align-items:center;justify-content:space-between;">

    <!-- 移动端头部 -->
    <template v-if="isMobile">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="material-symbols-outlined" style="color:#00288e;font-size:24px;line-height:1;">warehouse</span>
        <span style="font-size:17px;font-weight:700;color:#00288e;letter-spacing:0.01em;font-family:-apple-system,sans-serif;">仓库管理系统</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <el-tag v-if="!online" type="danger" size="mini">离线</el-tag>
        <el-badge v-if="pendingCount > 0" :value="pendingCount" type="warning">
          <el-button size="mini" icon="el-icon-refresh" circle @click="$router.push('/sync/pending')" />
        </el-badge>
      </div>
    </template>

    <!-- 桌面端头部 -->
    <template v-else>
      <i class="el-icon-s-fold" style="font-size:20px;cursor:pointer;color:#606266;" @click="$emit('toggle')" />
      <div style="display:flex;align-items:center;gap:16px;">
        <el-tag v-if="!online" type="danger" size="small">离线模式</el-tag>
        <el-badge v-if="pendingCount > 0" :value="pendingCount" type="warning">
          <el-button size="small" @click="$router.push('/sync/pending')">待同步</el-button>
        </el-badge>
        <el-dropdown @command="handleCommand">
          <span style="cursor:pointer;color:#606266;">
            <i class="el-icon-user-solid"></i> {{ username }}
            <i class="el-icon-arrow-down" style="margin-left:4px;"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="logout" icon="el-icon-switch-button">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </template>

  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { logout } from '../../api/auth'
import { networkState } from '../../utils/sync'
export default {
  props: {
    isMobile: { type: Boolean, default: false }
  },
  computed: {
    ...mapGetters(['username']),
    online() { return networkState.online },
    pendingCount() { return networkState.pendingCount }
  },
  methods: {
    async handleCommand(cmd) {
      if (cmd === 'logout') {
        await logout().catch(() => {})
        this.$store.commit('LOGOUT')
        this.$router.push('/login')
      }
    }
  }
}
</script>