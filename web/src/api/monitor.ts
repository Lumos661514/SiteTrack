import { http } from '@/utils/request'
import type { PageResult } from '@/api/product'

export interface MonitorError {
  id: number
  type: string
  message: string
  page: string
  filename: string
  createdAt: string
}

export interface MetricSummary {
  name: string
  avg: number
  count: number
}

export interface PageView {
  page: string
  count: number
}

export function fetchMonitorErrors(type: string, page: number, pageSize: number) {
  return http.get<PageResult<MonitorError>>('/monitor/errors', { type, page, pageSize })
}

export function fetchMonitorSummary() {
  return http.get<{ metrics: MetricSummary[]; pages: PageView[] }>('/monitor/summary')
}
