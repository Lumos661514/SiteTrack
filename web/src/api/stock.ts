import { http } from '@/utils/request'
import type { PageResult } from '@/api/product'

export interface StockRow {
  id: number
  name: string
  categoryName: string
  stock: number
  warningStock: number
  low: boolean
}

export interface StockLog {
  id: number
  productId: number
  productName: string
  type: string
  quantity: number
  remark: string
  createdAt: string
}

export function fetchStock(keyword: string, lowOnly: boolean, page: number, pageSize: number) {
  return http.get<PageResult<StockRow> & { lowCount: number }>('/stock', {
    keyword,
    lowOnly: lowOnly ? '1' : '0',
    page,
    pageSize,
  })
}

export function fetchStockLogs(productId: number | '', page: number, pageSize: number) {
  return http.get<PageResult<StockLog>>('/stock/logs', {
    productId: productId || '',
    page,
    pageSize,
  })
}

export function moveStock(payload: {
  productId: number
  type: 'in' | 'out'
  quantity: number
  remark: string
}) {
  return http.post<{ stock: number }>('/stock/movements', payload)
}
