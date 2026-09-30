import { http } from '@/utils/request'
import type { PageResult } from '@/api/product'

export interface Category {
  id: number
  name: string
  sort: number
  productCount: number
}

export function fetchCategories(keyword: string, page: number, pageSize: number) {
  return http.get<PageResult<Category>>('/categories', { keyword, page, pageSize })
}

export function createCategory(name: string, sort: number) {
  return http.post<{ id: number }>('/categories', { name, sort })
}

export function updateCategory(id: number, name: string, sort: number) {
  return http.put<{ ok: boolean }>(`/categories/${id}`, { name, sort })
}

export function deleteCategory(id: number) {
  return http.delete<{ ok: boolean }>(`/categories/${id}`)
}