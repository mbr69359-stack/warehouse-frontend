<template>
  <div style="width:100%;display:flex;align-items:center;justify-content:space-between;">
    <i class="el-icon-s-fold" style="font-size:20px;cursor:pointer;color:#606266;" @click="$emit('toggle')"></i>
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

<script>
import { mapGetters } from 'vuex'
import { logout } from '../../api/auth'
export default {
  computed: { ...mapGetters(['username']) },
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
