import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { Router } from 'vue-router'
import { fetchAccessApi, type MenuNode } from '@/api/auth'
import { addDynamicRoutes, removeDynamicRoutes, setNotFoundRedirect } from '@/router/dynamic'

export function firstMenuPath(nodes: MenuNode[]): string {
  for (const node of nodes) {
    if (node.component && node.path) return node.path
    const childPath = firstMenuPath(node.children)
    if (childPath) return childPath
  }
  return '/dashboard'
}

export const usePermissionStore = defineStore('permission', () => {
  const menus = shallowRef<MenuNode[]>([])
  const permissions = shallowRef<string[]>([])
  const loaded = shallowRef(false)
  const routeNames = shallowRef<string[]>([])
  const homePath = shallowRef('/dashboard')

  function has(code: string) {
    return permissions.value.includes(code)
  }

  async function generate(router: Router) {
    removeDynamicRoutes(router, routeNames.value)
    const data = await fetchAccessApi()
    menus.value = data.menus
    permissions.value = data.permissions
    homePath.value = firstMenuPath(data.menus)
    setNotFoundRedirect(homePath.value)
    routeNames.value = addDynamicRoutes(router, data.menus)
    loaded.value = true
  }

  function reset(router: Router) {
    removeDynamicRoutes(router, routeNames.value)
    menus.value = []
    permissions.value = []
    routeNames.value = []
    homePath.value = '/dashboard'
    loaded.value = false
  }

  return { menus, permissions, loaded, homePath, has, generate, reset }
})
