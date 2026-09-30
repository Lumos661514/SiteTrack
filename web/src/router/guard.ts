// 【面试重点】路由守卫
// 解决的问题：没有登录的人不能进后台页面，刷新后也不能只靠内存里的用户信息判断。
// 为什么这样设计：白名单路由（登录页）直接放行；有 token 才进系统。刷新后 profile 是空的，守卫里 await /auth/me，等接口结果再决定放行还是回登录页。用返回值控制跳转，不使用已废弃的 next()。登录页在已登录时不再重定向到自己，避免死循环。

import type { Router } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'
import { endSession } from '@/utils/session'

export function setupRouterGuard(router: Router) {
  router.beforeEach(async (to) => {
    const user = useUserStore()
    const permission = usePermissionStore()

    if (to.meta.public) {
      if (user.token) return permission.homePath
      return true
    }

    if (!user.token) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (!user.profile) {
      try {
        await user.fetchProfile()
      } catch {
        endSession(router)
        return { path: '/login', query: { redirect: to.fullPath } }
      }
    }

    // 【面试重点】动态路由要在导航完成前注册
    // 解决的问题：刷新后前端路由表里还没有商品页，直接放行会匹配不到。
    // 为什么这样设计：先向后端要当前角色的菜单并 addRoute，再返回原地址重新匹配。登录页不会走进这里。
    if (!permission.loaded) {
      try {
        await permission.generate(router)
      } catch {
        endSession(router)
        return { path: '/login', query: { redirect: to.fullPath } }
      }
      return to.path === '/' ? permission.homePath : to.fullPath
    }

    if (to.path === '/') return permission.homePath
    return true
  })

  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} - SiteTrack` : 'SiteTrack'
  })
}
