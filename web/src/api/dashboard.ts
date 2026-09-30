import { http } from '@/utils/request'

export interface Summary {
  orderCount: number
  productCount: number
  userCount: number
}

export function fetchSummary() {
  return http.get<Summary>('/dashboard/summary')
}
