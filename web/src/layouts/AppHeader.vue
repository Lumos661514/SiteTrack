<script setup lang="ts">
import { Expand, Fold } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logoutApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { endSession } from '@/utils/session'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const title = computed(() => route.meta.title ?? '')
const nickname = computed(() => user.profile?.nickname ?? '用户')

async function logout() {
  try {
    await logoutApi()
  } catch {
    // token 已经失效时，本地仍然要退出。
  }
  endSession(router)
  await router.push('/login')
}
</script>

<template>
  <header class="header">
    <div class="left">
      <button class="fold" type="button" @click="emit('toggle')">
        <el-icon><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
      </button>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="title && title !== '工作台'">{{ title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <el-dropdown trigger="click" @command="logout">
      <span class="user">
        <span class="avatar">{{ nickname.slice(0, 1) }}</span>
        <span>{{ nickname }}</span>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="logout">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--st-header-height);
  padding-right: 12px;
  background: #fff;
}

.left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.fold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: var(--st-header-height);
  color: #606266;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.fold:hover,
.user:hover {
  background: #f6f6f6;
}

.user {
  display: inline-flex;
  align-items: center;
  height: var(--st-header-height);
  padding: 0 10px;
  color: rgb(0 0 0 / 85%);
  cursor: pointer;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: 8px;
  color: #fff;
  font-size: 12px;
  background: var(--el-color-primary);
  border-radius: 50%;
}
</style>
