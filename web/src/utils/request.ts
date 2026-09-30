// 【面试重点】Axios 封装
// 解决的问题：如果每个页面自己带 token、自己弹错误、自己处理过期登录，行为会不一致，重复点击还会让旧请求覆盖新结果。
// 为什么这样设计：请求拦截器统一加 token，响应拦截器统一处理错误和 401。重复请求用 AbortController 取消上一次。业务代码只拿 data。
// 401 不在这里直接 import store，而是注册回调，避免 request 和 store 循环依赖。

import { getMonitor } from '@sitetrack/sdk'
import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { TOKEN_KEY } from '@/constants/auth'

interface RequestConfig extends InternalAxiosRequestConfig {
  requestKey?: string
}

const pending = new Map<string, AbortController>()
let onUnauthorized = () => {}
let handling401 = false

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

function stableString(value: unknown) {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    const names = [...value.keys()].join(',')
    return `form:${names}:${value.get('file') instanceof File ? (value.get('file') as File).name : ''}`
  }
  return JSON.stringify(value)
}

function buildKey(config: InternalAxiosRequestConfig) {
  const method = (config.method ?? 'get').toLowerCase()
  return [method, config.url ?? '', stableString(config.params), stableString(config.data)].join('&')
}

// 【面试重点】相同请求未完成时取消上一次
// 解决的问题：同一个接口、同一组参数连点时，慢的响应后到会盖住先到的那次。
// 为什么这样设计：键里带上方法和参数，只取消完全相同的请求。关键词不同的搜索不会互相取消，那种竞态由 useTable 的请求序号处理。Abort 只让前端不再等待，服务端可能已经执行，所以防重复提交要靠按钮 loading，不能只靠取消请求。
// FormData 不能都用同一个键，否则连续上传不同图片会把前一张取消掉。
function addPending(config: RequestConfig) {
  const key = buildKey(config)
  pending.get(key)?.abort()
  const controller = new AbortController()
  config.signal = controller.signal
  config.requestKey = key
  pending.set(key, controller)
}

function removePending(config?: RequestConfig) {
  if (!config?.requestKey) return
  const current = pending.get(config.requestKey)
  if (current && current.signal === config.signal) {
    pending.delete(config.requestKey)
  }
}

const instance = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

instance.interceptors.request.use((config) => {
  const requestConfig = config as RequestConfig
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    requestConfig.headers.set('Authorization', `Bearer ${token}`)
  }
  addPending(requestConfig)
  return requestConfig
})

instance.interceptors.response.use(
  (response) => {
    removePending(response.config as RequestConfig)
    return response.data.data
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      removePending(error.config as RequestConfig | undefined)
      if (error.code === 'ERR_CANCELED') {
        return Promise.reject(error)
      }
      const status = error.response?.status
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ??
        (status ? `请求失败（${status}）` : '网络异常，请稍后重试')
      if (!error.response || (status != null && status >= 500)) {
        getMonitor()?.captureException(error, 'api')
      }
      if (status === 401) {
        if (!handling401) {
          handling401 = true
          ElMessage.error('登录已过期，请重新登录')
          onUnauthorized()
          window.setTimeout(() => {
            handling401 = false
          }, 1000)
        }
        return Promise.reject(error)
      }
      ElMessage.error(message)
    }
    return Promise.reject(error)
  },
)

export function request<T>(config: AxiosRequestConfig) {
  return instance.request(config) as Promise<T>
}

export const http = {
  get<T>(url: string, params?: Record<string, unknown>) {
    return request<T>({ url, method: 'GET', params })
  },
  post<T>(url: string, data?: unknown) {
    return request<T>({ url, method: 'POST', data })
  },
  put<T>(url: string, data?: unknown) {
    return request<T>({ url, method: 'PUT', data })
  },
  patch<T>(url: string, data?: unknown) {
    return request<T>({ url, method: 'PATCH', data })
  },
  delete<T>(url: string) {
    return request<T>({ url, method: 'DELETE' })
  },
}
