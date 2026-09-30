// 【面试重点】白屏检测
// 解决的问题：JS 把根节点渲染空了，但没有抛异常，错误监控是安静的，用户看到的却是白屏。
// 为什么这样设计：页面加载后再等几秒，在视口里取几个点做 elementFromPoint。这些点如果都落在 html 或 body 上，说明中间没有实际内容。SPA 首屏会晚一点出来，所以不能在 DOMContentLoaded 立刻判断。

import type { MonitorEvent } from './types'

const POINTS = [
  [0.5, 0.5],
  [0.25, 0.35],
  [0.75, 0.35],
  [0.25, 0.7],
  [0.75, 0.7],
]

export function detectBlank(enqueue: (event: MonitorEvent) => void, page: () => string) {
  window.setTimeout(() => {
    if (document.visibilityState === 'hidden') return
    const blank = POINTS.every(([xRate, yRate]) => {
      const x = window.innerWidth * xRate
      const y = window.innerHeight * yRate
      const element = document.elementFromPoint(x, y)
      return !element || element === document.body || element === document.documentElement
    })
    if (!blank) return
    enqueue({
      kind: 'error',
      type: 'blank',
      message: '页面白屏',
      page: page(),
      time: Date.now(),
    })
  }, 4000)
}
