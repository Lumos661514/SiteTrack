// 【面试重点】批量上报、失败重试、sendBeacon
// 解决的问题：每条错误都立刻发请求，会拖慢页面；用户关掉页签时，普通请求还会被浏览器取消。
// 为什么这样设计：先攒一批再发。页面隐藏或关闭时用 sendBeacon，它能在卸载过程中把数据送出去。Beacon 带不上 Authorization，所以采集接口不走登录态。发送失败就放进 localStorage，下次启动再试，避免白屏或报错在关页时丢掉。

import type { MonitorEvent } from './types'

const STORAGE_KEY = 'sitetrack-monitor-queue'
const BATCH_SIZE = 10
const FLUSH_INTERVAL = 5000
const MAX_RETRY = 100

export interface Reporter {
  enqueue: (event: MonitorEvent) => void
  flush: (useBeacon?: boolean) => void
}

export function createReporter(reportUrl: string, appKey: string): Reporter {
  const queue: MonitorEvent[] = []

  function readRetry(): MonitorEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? (parsed as MonitorEvent[]) : []
    } catch {
      return []
    }
  }

  function writeRetry(events: MonitorEvent[]) {
    if (!events.length) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_RETRY)))
  }

  function clip(event: MonitorEvent): MonitorEvent {
    return {
      ...event,
      message: event.message?.slice(0, 500),
      stack: event.stack?.slice(0, 2000),
    }
  }

  function splitBySize(events: MonitorEvent[], limit = 60_000) {
    const batches: MonitorEvent[][] = []
    let current: MonitorEvent[] = []
    let size = 2
    for (const event of events) {
      const bytes = JSON.stringify(event).length
      if (current.length && size + bytes > limit) {
        batches.push(current)
        current = []
        size = 2
      }
      current.push(event)
      size += bytes
    }
    if (current.length) batches.push(current)
    return batches
  }

  function remember(events: MonitorEvent[]) {
    writeRetry(readRetry().concat(events))
  }

  function send(events: MonitorEvent[], useBeacon: boolean) {
    const body = JSON.stringify({ appKey, events })
    if (useBeacon && typeof navigator.sendBeacon === 'function' && body.length <= 60_000) {
      const accepted = navigator.sendBeacon(
        reportUrl,
        new Blob([body], { type: 'application/json' }),
      )
      if (!accepted) remember(events)
      return
    }
    fetch(reportUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: body.length <= 60_000,
    })
      .then((response) => {
        if (response.status >= 500) remember(events)
      })
      .catch(() => remember(events))
  }

  function flush(useBeacon = false) {
    const events = readRetry().concat(queue.splice(0, queue.length)).slice(-MAX_RETRY).map(clip)
    if (!events.length) return
    writeRetry([])
    for (const batch of splitBySize(events)) send(batch, useBeacon)
  }

  function enqueue(event: MonitorEvent) {
    if (event.kind === 'metric' && event.name) {
      const previous = queue.find(
        (item) => item.kind === 'metric' && item.name === event.name && item.page === event.page,
      )
      if (previous) {
        previous.value = event.name === 'INP' ? Math.max(previous.value ?? 0, event.value ?? 0) : event.value
        previous.time = event.time
      } else {
        queue.push(event)
      }
    } else {
      queue.push(event)
    }
    if (queue.length >= BATCH_SIZE) flush(false)
  }

  window.setInterval(() => flush(false), FLUSH_INTERVAL)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
  window.addEventListener('pagehide', () => flush(true))

  return { enqueue, flush }
}
