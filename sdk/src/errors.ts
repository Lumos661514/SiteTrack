// 【面试重点】JS 错误、Promise 错误、资源加载错误
// 解决的问题：脚本抛错、未处理的 Promise、图片或脚本加载失败，用户只会看到白屏或按钮没反应，后台却没有记录。
// 为什么这样设计：window.error 在捕获阶段才能接到资源错误，因为资源错误不冒泡。Promise 用 unhandledrejection。上报地址本身失败时不再记成一条新错误，避免死循环。

import type { MonitorEvent } from './types'

interface CaptureContext {
  page: () => string
  enqueue: (event: MonitorEvent) => void
  reportUrl: string
}

function pushError(context: CaptureContext, event: Omit<MonitorEvent, 'kind' | 'page' | 'time'>) {
  const message = event.message ?? ''
  if (message.includes(context.reportUrl)) return
  context.enqueue({
    kind: 'error',
    page: context.page(),
    time: Date.now(),
    ...event,
    message,
  })
}

export function listenErrors(context: CaptureContext) {
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target
      if (target && target !== window) {
        const element = target as HTMLElement & { src?: string; href?: string }
        const url = element.src || element.href || ''
        if (!url || url.includes('favicon.ico')) return
        pushError(context, { type: 'resource', message: url, filename: url })
        return
      }
      pushError(context, {
        type: 'js',
        message: event.message,
        filename: event.filename,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      })
    },
    true,
  )

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as unknown
    const error = reason instanceof Error ? reason : null
    pushError(context, {
      type: 'promise',
      message: error?.message || String(reason),
      stack: error?.stack,
    })
  })

  return {
    captureException(error: unknown) {
      const normalized = error instanceof Error ? error : new Error(String(error))
      pushError(context, { type: 'js', message: normalized.message, stack: normalized.stack })
    },
  }
}
