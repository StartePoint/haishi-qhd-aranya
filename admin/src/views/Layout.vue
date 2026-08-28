<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">海拾后台</div>
      <el-menu :default-active="$route.path" router>
        <el-menu-item index="/categories">品类</el-menu-item>
        <el-menu-item index="/sub-categories">种类</el-menu-item>
        <el-menu-item index="/products">商品</el-menu-item>
        <el-menu-item index="/leads">询价单</el-menu-item>
        <el-menu-item index="/configs">系统配置</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span>{{ auth.username }}</span>
        <el-button link type="danger" @click="logout">退出</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
}
.aside {
  background: #fff;
  border-right: 1px solid #eee;
}
.logo {
  padding: 20px 16px;
  font-weight: 700;
}
.header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
</style>
