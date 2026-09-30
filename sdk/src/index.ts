// 【面试重点】监控 SDK 入口
// 解决的问题：业务代码里到处 try/catch 会漏，也没法在关页时把数据送走。
// 为什么这样设计：初始化时一次性挂上错误、性能、白屏和页面访问。对外只暴露主动上报和立刻发送，供 Vue 的 errorHandler 和演示按钮使用。打包同时产出 ESM 和 UMD，前者给后台工程引用，后者可以挂到没有构建工具的页面上。

import { detectBlank } from './blank'
import { listenErrors } from './errors'
import { listenPerformance } from './performance'
import { listenPageView } from './pv'
import { createReporter } from './report'
import type { MonitorOptions } from './types'

export interface MonitorClient {
  captureException: (error: unknown) => void
  flush: () => void
}

let current: MonitorClient | null = null
let started = false

export function initMonitor(options: MonitorOptions): MonitorClient {
  if (current && started) return current
  const page = () => options.getPage?.() ?? location.pathname
  const reporter = createReporter(options.reportUrl, options.appKey)
  const errors = listenErrors({
    page,
    enqueue: reporter.enqueue,
    reportUrl: options.reportUrl,
  })
  listenPerformance(reporter.enqueue, page)
  listenPageView(reporter.enqueue, page)
  detectBlank(reporter.enqueue, page)
  started = true
  current = {
    captureException: errors.captureException,
    flush: () => reporter.flush(false),
  }
  return current
}

export function getMonitor() {
  return current
}

export type { MonitorEvent, MonitorOptions } from './types'
