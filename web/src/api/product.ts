import { http } from '@/utils/request'

export interface Spec {
  name: string
  values: string[]
}

export interface Product {
  id: number
  categoryId: number
  categoryName: string
  name: string
  price: number
  stock: number
  warningStock: number
  cover: string
  status: number
  specs: Spec[]
}

export interface ProductQuery {
  keyword: string
  status: '' | 0 | 1
  categoryId: '' | number
}

export interface PageResult<T> {
  list: T[]
  total: number
}

export function fetchProducts(query: ProductQuery, page: number, pageSize: number) {
  return http.get<PageResult<Product>>('/products', {
    keyword: query.keyword,
    status: query.status,
    categoryId: query.categoryId,
    page,
    pageSize,
  })
}

export function fetchProduct(id: number) {
  return http.get<Product>(`/products/${id}`)
}

export function createProduct(data: Omit<Product, 'id' | 'categoryName'>) {
  return http.post<{ id: number }>('/products', data)
}

export function updateProduct(id: number, data: Omit<Product, 'id' | 'categoryName'>) {
  return http.put<unknown>(`/products/${id}`, data)
}

export function updateProductStatus(id: number, status: number) {
  return http.patch<{ ok: boolean }>(`/products/${id}/status`, { status })
}

export function uploadImage(file: File) {
  const data = new FormData()
  data.append('file', file)
  return http.post<{ url: string }>('/upload', data)
}