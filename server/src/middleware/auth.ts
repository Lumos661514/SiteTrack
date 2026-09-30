// 【面试重点】JWT 鉴权中间件
// 解决的问题：受保护接口必须确认“这个请求是谁”，不能只靠前端自己说已经登录。
// 为什么这样设计：登录接口公开，其余接口走这一层。token 无效、过期、格式不对都返回 401，前端拦截器看到 401 就清登录态并跳回登录页。

import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../utils/token'
import type { TokenPayload } from '../types'

declare global {
  // Express 的请求类型只能通过 namespace 扩展。
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: TokenPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: '未登录' })
    return
  }

  try {
    req.auth = verifyToken(header.slice('Bearer '.length))
    next()
  } catch {
    res.status(401).json({ message: '登录已过期' })
  }
}
