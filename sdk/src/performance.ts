// 【面试重点】FCP、LCP、INP、CLS
// 解决的问题：只记报错看不出页面慢在哪。首屏、最大内容、交互延迟和布局抖动要分开看。
// 为什么这样设计：这四项都来自 PerformanceObserver，而不是自己用 Date.now 估。LCP 会多次回调，只留最后一次。INP 取本次访问里最慢的一次交互；样本少时这比硬算 98 分位更稳定。CLS 把没有伴随输入的位移累加起来。

import type { MetricName, MonitorEvent } from './types'

interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

interface EventTimingEntry extends PerformanceEntry {
  duration: number
  interactionId?: number
}

export function listenPerformance(enqueue: (event: MonitorEvent) => void, page: () => string) {
  const latest: Partial<Record<MetricName, number>> = {}

  function report(name: MetricName, value: number) {
    if (name === 'INP' && (latest.INP ?? 0) > value) return
    if (name === 'FCP' && latest.FCP != null) return
    latest[name] = value
    enqueue({
      kind: 'metric',
      name,
      value: Math.round(value * 1000) / 1000,
      page: page(),
      time: Date.now(),
    })
  }

  function observe(type: string, handler: (entry: PerformanceEntry) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(handler)
      })
      observer.observe({ type, buffered: true } as PerformanceObserverInit)
    } catch {
      // 老浏览器没有对应 entry type 时跳过，不影响其他指标。
    }
  }

  observe('paint', (entry) => {
    if (entry.name === 'first-contentful-paint') report('FCP', entry.startTime)
  })
  observe('largest-contentful-paint', (entry) => {
    report('LCP', entry.startTime)
  })
  observe('layout-shift', (entry) => {
    const shift = entry as LayoutShiftEntry
    if (shift.hadRecentInput) return
    report('CLS', (latest.CLS ?? 0) + shift.value)
  })
  observe('event', (entry) => {
    const timing = entry as EventTimingEntry
    if (!timing.interactionId) return
    report('INP', timing.duration)
  })
}
