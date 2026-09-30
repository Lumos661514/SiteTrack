<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/layouts/AppHeader.vue'
import SidebarMenu from '@/layouts/SidebarMenu.vue'
import TagsView, { type TagItem } from '@/layouts/TagsView.vue'
import { usePermissionStore } from '@/stores/permission'

const route = useRoute()
const router = useRouter()
const permission = usePermissionStore()
const collapsed = shallowRef(false)
const isMobile = shallowRef(false)
const mobileOpen = shallowRef(false)
const tags = ref<TagItem[]>([{ path: '/dashboard', title: '工作台', affix: true }])
const sidebarCollapsed = computed(() => (isMobile.value ? !mobileOpen.value : collapsed.value))

watch(
  () => route.fullPath,
  () => {
    if (isMobile.value) mobileOpen.value = false
    const title = route.meta.title
    if (!title || route.meta.public) return
    if (tags.value.some((tag) => tag.path === route.path)) return
    tags.value.push({
      path: route.path,
      title,
      affix: route.path === '/dashboard',
    })
  },
  { immediate: true },
)

function syncViewport() {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
  if (isMobile.value) mobileOpen.value = false
}

function toggleSidebar() {
  if (isMobile.value) {
    mobileOpen.value = !mobileOpen.value
    return
  }
  collapsed.value = !collapsed.value
}

function openTag(path: string) {
  void router.push(path)
}

function closeTag(path: string) {
  const index = tags.value.findIndex((tag) => tag.path === path)
  const current = tags.value[index]
  if (!current || current.affix) return
  tags.value.splice(index, 1)
  if (route.path !== path) return
  const next = tags.value[index] ?? tags.value[index - 1]
  if (next) void router.push(next.path)
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewport)
})
</script>

<template>
  <div class="shell" :class="{ mobile: isMobile, 'mobile-open': mobileOpen, collapsed }">
    <SidebarMenu :collapsed="sidebarCollapsed" :menus="permission.menus" />
    <button v-if="isMobile && mobileOpen" class="mask" type="button" @click="mobileOpen = false" />
    <div class="main">
      <div class="fixed-header">
        <AppHeader :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
        <TagsView :tags="tags" :active="route.path" @open="openTag" @close="closeTag" />
      </div>
      <section class="content">
        <router-view />
      </section>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100%;
}

.main {
  min-height: 100vh;
  margin-left: var(--st-sidebar-width);
  background: var(--st-bg);
  transition: margin-left 0.3s;
}

.collapsed .main {
  margin-left: var(--st-sidebar-collapse);
}

.fixed-header {
  position: sticky;
  top: 0;
  z-index: 998;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 21 41 / 8%);
}

.content {
  padding: 10px;
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgb(0 0 0 / 35%);
  border: 0;
}

.mobile .main,
.mobile.collapsed .main {
  margin-left: 0;
}

.mobile :deep(.sidebar) {
  transform: translateX(-100%);
}

.mobile.mobile-open :deep(.sidebar) {
  transform: translateX(0);
  width: var(--st-sidebar-width);
}
</style>
