import type { Router } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'

/** 退出或 401 时同时清 token 和已经 addRoute 的页面，避免下一个账号沿用上一份路由。 */
export function endSession(router: Router) {
  usePermissionStore().reset(router)
  useUserStore().clearSession()
}
