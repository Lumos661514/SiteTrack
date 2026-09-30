<script setup lang="ts">
import type { MenuNode } from '@/api/auth'
import SidebarItem from '@/layouts/SidebarItem.vue'

defineProps<{
  collapsed: boolean
  menus: MenuNode[]
}>()
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
    <router-link class="logo" to="/dashboard">
      <span class="mark">S</span>
      <span v-show="!collapsed" class="name">SiteTrack</span>
    </router-link>
    <nav class="menu">
      <SidebarItem v-for="menu in menus" :key="menu.id" :item="menu" :collapsed="collapsed" />
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1001;
  width: var(--st-sidebar-width);
  overflow: hidden;
  background: #fff;
  border-right: 1px solid #e7e7e7;
  transition: width 0.3s;
}

.is-collapsed {
  width: var(--st-sidebar-collapse);
}

.logo {
  display: flex;
  align-items: center;
  height: var(--st-header-height);
  padding: 0 16px;
}

.is-collapsed .logo {
  justify-content: center;
  padding: 0;
}

.mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #fff;
  font-weight: 700;
  background: var(--el-color-primary);
  border-radius: 8px;
}

.name {
  margin-left: 12px;
  overflow: hidden;
  color: rgb(0 0 0 / 85%);
  font-weight: 600;
  font-size: 18px;
  white-space: nowrap;
}

.menu {
  height: calc(100% - var(--st-header-height));
  padding-top: 4px;
  overflow: auto;
}
</style>
