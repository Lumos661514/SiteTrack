// 【面试重点】按钮权限指令 v-permission
// 解决的问题：能打开商品列表，不代表可以新增或上下架。这些操作要按角色从界面上消失。
// 为什么这样设计：没有权限就隐藏按钮，节点仍交给 Vue 管理。直接删掉 DOM 后，Vue 更新时会碰到已经不存在的节点，权限变了也无法再显示。真正拦住请求的是后端同一套权限码。

import type { Directive } from 'vue'
import { usePermissionStore } from '@/stores/permission'

function apply(el: HTMLElement, code: string) {
  const allowed = !code || usePermissionStore().has(code)
  el.style.display = allowed ? '' : 'none'
}

export const permissionDirective: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    apply(el, binding.value)
  },
  updated(el, binding) {
    apply(el, binding.value)
  },
}
