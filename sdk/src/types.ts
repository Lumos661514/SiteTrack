export type ErrorType = 'js' | 'promise' | 'resource' | 'blank' | 'api'
export type MetricName = 'FCP' | 'LCP' | 'INP' | 'CLS'

export interface MonitorEvent {
  kind: 'error' | 'metric' | 'pv'
  type?: ErrorType
  name?: MetricName
  message?: string
  stack?: string
  filename?: string
  value?: number
  page: string
  time: number
}

export interface MonitorOptions {
  reportUrl: string
  appKey: string
  getPage?: () => string
}
