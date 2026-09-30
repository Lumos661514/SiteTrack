import type { UserProfile } from '@/stores/user'
import { http } from '@/utils/request'

export interface LoginResult {
  token: string
  user: UserProfile
}

export function loginApi(username: string, password: string) {
  return http.post<LoginResult>('/auth/login', { username, password })
}

export function profileApi() {
  return http.get<UserProfile>('/auth/me')
}

export interface MenuNode {
  id: number
  name: string
  path: string
  component: string
  icon: string
  children: MenuNode[]
}

export function fetchAccessApi() {
  return http.get<{ menus: MenuNode[]; permissions: string[] }>('/auth/menus')
}
