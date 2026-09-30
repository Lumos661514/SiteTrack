import type { MonitorEvent } from './types'

export function listenPageView(enqueue: (event: MonitorEvent) => void, page: () => string) {
  let lastPage = ''

  function report() {
    const current = page()
    if (current === lastPage) return
    lastPage = current
    enqueue({ kind: 'pv', page: current, time: Date.now() })
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
