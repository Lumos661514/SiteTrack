// 【面试重点】前端 token 存储
// 解决的问题：刷新页面后还要保持登录，但又不能把密码留在浏览器里。
// 为什么这样设计：只把 token 放进 localStorage，用户资料放内存。刷新后路由守卫拿 token 再请求 /auth/me。退出登录时两边一起清掉。localStorage 能被 XSS 读到，正式环境更稳妥的是 httpOnly Cookie，后台演示项目用 localStorage 是为了把「请求头带 token」这条链路讲清楚。

import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { loginApi, profileApi } from '@/api/auth'
import { TOKEN_KEY } from '@/constants/auth'

export interface UserProfile {
  id: number
  username: string
  nickname: string
  roleCode: string
  roleName: string
}

export const useUserStore = defineStore('user', () => {
  const token = shallowRef(localStorage.getItem(TOKEN_KEY) ?? '')
  const profile = shallowRef<UserProfile | null>(null)

  function setToken(value: string) {
    token.value = value
    localStorage.setItem(TOKEN_KEY, value)
  }

  function clearSession() {
    token.value = ''
    profile.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  async function login(username: string, password: string) {
    const result = await loginApi(username, password)
    setToken(result.token)
    profile.value = result.user
  }

  async function fetchProfile() {
    profile.value = await profileApi()
  }

  return { token, profile, login, fetchProfile, clearSession }
})
