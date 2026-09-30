// 【面试重点】JWT 签发与校验
// 解决的问题：登录之后如何在后续请求里认出用户，同时又不在服务器内存里保存会话。
// 为什么这样设计：密码校验通过后只签发一段带过期时间的 token。服务端不存 session，靠签名判断 token 有没有被改过、是否过期，多实例部署时也不用共享会话。

import jwt from 'jsonwebtoken'
import { config } from '../config'
import type { TokenPayload } from '../types'

/** 登录成功后签发 token。过期时间用秒，避免各库对字符串时长的解析差异。 */
export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

/** 校验失败会抛错，由鉴权中间件统一转成 401。 */
export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as TokenPayload
}
