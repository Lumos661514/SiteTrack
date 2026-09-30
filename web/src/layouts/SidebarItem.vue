<script setup lang="ts">
import { shallowRef } from 'vue'

defineOptions({ name: 'SidebarItem' })
import { useRoute, useRouter } from 'vue-router'
import type { MenuNode } from '@/api/auth'
import { menuIcon } from '@/router/menus'

const props = defineProps<{
  item: MenuNode
  collapsed: boolean
}>()

const route = useRoute()
const router = useRouter()
const icon = menuIcon(props.item.icon)

function matches(item: MenuNode, path: string): boolean {
  if (item.path === path) return true
  return item.children.some((child) => matches(child, path))
}

function firstPath(item: MenuNode): string {
  if (item.component && item.path) return item.path
  for (const child of item.children) {
    const path = firstPath(child)
    if (path) return path
  }
  return item.path
}

const opened = shallowRef(matches(props.item, route.path))

function onParentClick() {
  if (props.collapsed) {
    const path = firstPath(props.item)
    if (path) void router.push(path)
    return
  }
  opened.value = !opened.value
}
</script>

<template>
  <div v-if="item.children.length" class="group">
    <button
      class="item"
      :class="{ 'is-collapsed': collapsed, 'child-active': matches(item, route.path) }"
      type="button"
      :title="collapsed ? item.name : undefined"
      @click="onParentClick"
    >
      <el-icon v-if="icon" class="icon"><component :is="icon" /></el-icon>
      <span v-show="!collapsed" class="label">{{ item.name }}</span>
    </button>
    <div v-show="!collapsed && opened" class="children">
      <SidebarItem
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :collapsed="collapsed"
      />
    </div>
  </div>
  <router-link
    v-else
    class="item"
    :class="{ active: route.path === item.path, 'is-collapsed': collapsed }"
    :to="item.path"
    :title="collapsed ? item.name : undefined"
  >
    <el-icon v-if="icon" class="icon"><component :is="icon" /></el-icon>
    <span v-show="!collapsed" class="label">{{ item.name }}</span>
  </router-link>
</template>

<style scoped>
.item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 50px;
  padding: 0 16px;
  color: var(--st-menu-text);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.is-collapsed {
  justify-content: center;
  padding: 0;
}

.item:hover,
.child-active {
  color: #000;
}

.item.active {
  color: #fff;
}

.item.active::before {
  position: absolute;
  inset: 4px 8px;
  background: var(--el-color-primary);
  border-radius: 3px;
  content: '';
}

.icon,
.label {
  position: relative;
  z-index: 1;
}

.icon {
  font-size: 18px;
}

.label {
  margin-left: 8px;
  overflow: hidden;
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.children {
  padding-left: 12px;
}
</style>
