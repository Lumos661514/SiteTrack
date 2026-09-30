// 【面试重点】动态路由 + 路由懒加载
// 解决的问题：菜单如果写死在前端，客服也能猜到地址进入商品页。页面如果全部打进首包，打开登录页也要下载订单列表和图表。
// 为什么这样设计：路由表来自后端按角色返回的菜单，只给有 component 的菜单 addRoute。组件用 () => import()，Vite 会把每个页面打成独立 chunk，进到该页才下载。刷新时路由表是空的，所以要先加上再重新进入当前地址。退出登录必须 removeRoute。

import type { Router, RouteRecordRaw } from 'vue-router'
import type { MenuNode } from '@/api/auth'
import ModuleView from '@/views/common/ModuleView.vue'

const viewMap: Record<string, RouteRecordRaw['component']> = {
  'dashboard/DashboardView': () => import('@/views/dashboard/DashboardView.vue'),
  'product/ProductList': () => import('@/views/product/ProductList.vue'),
  'product/CategoryList': () => import('@/views/product/CategoryList.vue'),
  'order/OrderList': () => import('@/views/order/OrderList.vue'),
  'stock/StockList': () => import('@/views/stock/StockList.vue'),
  'stock/StockLogs': () => import('@/views/stock/StockLogs.vue'),
  'analysis/AnalysisView': () => import('@/views/analysis/AnalysisView.vue'),
  'monitor/MonitorView': () => import('@/views/monitor/MonitorView.vue'),
}

const pendingDesc: Record<string, string> = {
  'system/UserList': '用户管理随权限数据已可按角色隐藏，页面在后续补充。',
  'system/RoleList': '角色管理随权限数据已可按角色隐藏，页面在后续补充。',
}

const NOT_FOUND = 'not-found'
let notFoundPath = '/dashboard'

export function setNotFoundRedirect(path: string) {
  notFoundPath = path || '/dashboard'
}

function walk(nodes: MenuNode[], visit: (node: MenuNode) => void) {
  for (const node of nodes) {
    if (node.component) visit(node)
    if (node.children.length) walk(node.children, visit)
  }
}

export function addDynamicRoutes(router: Router, menus: MenuNode[]) {
  const names: string[] = []
  walk(menus, (node) => {
    const name = `route:${node.path}`
    router.addRoute('layout', {
      path: node.path.replace(/^\//, ''),
      name,
      component: viewMap[node.component] ?? ModuleView,
      meta: {
        title: node.name,
        desc: viewMap[node.component] ? '' : (pendingDesc[node.component] ?? '后续阶段实现'),
      },
    })
    names.push(name)
  })
  router.addRoute({
    path: '/:pathMatch(.*)*',
    name: NOT_FOUND,
    redirect: () => notFoundPath,
  })
  names.push(NOT_FOUND)
  return names
}

export function removeDynamicRoutes(router: Router, names: string[]) {
  for (const name of names) {
    if (router.hasRoute(name)) router.removeRoute(name)
  }
}
