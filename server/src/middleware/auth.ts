// 【面试重点】JWT 鉴权中间件
// 解决的问题：受保护接口必须确认“这个请求是谁”，不能只靠前端自己说已经登录。
// 为什么这样设计：登录接口公开，其余接口走这一层。token 无效、过期、格式不对都返回 401，前端拦截器看到 401 就清登录态并跳回登录页。

import type { NextFunction, Request, Response } from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
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

  let payload: TokenPayload
  try {
    payload = verifyToken(header.slice('Bearer '.length))
  } catch {
    res.status(401).json({ message: '登录已过期' })
    return
  }

  pool
    .query<RowDataPacket[]>(
      'SELECT status, token_version FROM users WHERE id = ? LIMIT 1',
      [payload.uid],
    )
    .then(([rows]) => {
      const user = rows[0]
      const disabled = !user || Number(user.status) !== 1
      const revoked = Number(user?.token_version ?? 0) !== Number(payload.ver ?? 0)
      if (disabled || revoked) {
        res.status(401).json({ message: '登录已过期' })
        return
      }
      req.auth = payload
      next()
    })
    .catch(next)
}
