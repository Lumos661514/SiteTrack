// 【面试重点】按钮权限指令 v-permission
// 解决的问题：能打开商品列表，不代表可以新增或上下架。这些操作要按角色从界面上消失。
// 为什么这样设计：指令挂到按钮上，没有权限就从 DOM 删掉，而不是只设 display:none。只隐藏的话，元素还在，控制台里可以再点。真正拦住请求的是后端同一套权限码，指令只负责界面。

import type { Directive } from 'vue'
import { usePermissionStore } from '@/stores/permission'

function removeIfDenied(el: HTMLElement, code: string) {
  if (!code || usePermissionStore().has(code)) return
  el.parentNode?.removeChild(el)
}

export const permissionDirective: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    removeIfDenied(el, binding.value)
  },
  updated(el, binding) {
    removeIfDenied(el, binding.value)
  },
}
