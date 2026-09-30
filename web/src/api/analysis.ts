import { http } from '@/utils/request'

export interface TrendPoint {
  day: string
  orderCount: number
  sales: number
}

export interface RankItem {
  name: string
  quantity: number
  amount: number
}

export function fetchAnalysis(days = 30) {
  return http.get<{ trend: TrendPoint[]; ranking: RankItem[] }>('/analysis/overview', { days })
}
