import type { MonitorEvent } from './types'

export function listenPageView(enqueue: (event: MonitorEvent) => void, page: () => string) {
  let lastPage = ''
  let lastAt = 0

  function report() {
    const current = page()
    const now = Date.now()
    if (current === lastPage && now - lastAt < 400) return
    lastPage = current
    lastAt = now
    enqueue({ kind: 'pv', page: current, time: now })
  }

  const rawPush = history.pushState.bind(history)
  const rawReplace = history.replaceState.bind(history)
  history.pushState = (...args: Parameters<History['pushState']>) => {
    rawPush(...args)
    report()
  }
  history.replaceState = (...args: Parameters<History['replaceState']>) => {
    rawReplace(...args)
    report()
  }
  window.addEventListener('popstate', report)
  report()
}
