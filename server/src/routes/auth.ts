import bcrypt from 'bcryptjs'
import { Router } from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import type { PublicUser } from '../types'
import { asyncHandler } from '../utils/asyncHandler'
import { signToken } from '../utils/token'

export const authRouter = Router()

const userSelect = `
  SELECT u.id, u.username, u.nickname, u.password_hash, r.code AS role_code, r.name AS role_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
`

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username ?? '').trim()
    const password = String(req.body?.password ?? '')
    if (!username || !password) {
      res.status(400).json({ message: '请输入账号和密码' })
      return
    }

    const [rows] = await pool.query<RowDataPacket[]>(`${userSelect} WHERE u.username = ? LIMIT 1`, [
      username,
    ])
    const user = rows[0]
    const matched = user ? await bcrypt.compare(password, String(user.password_hash)) : false
    if (!user || !matched) {
      res.status(400).json({ message: '账号或密码错误' })
      return
    }

    const token = signToken({ uid: Number(user.id), roleCode: String(user.role_code) })
    const profile: PublicUser = {
      id: Number(user.id),
      username: String(user.username),
      nickname: String(user.nickname),
      roleCode: String(user.role_code),
      roleName: String(user.role_name),
    }
    res.json({ data: { token, user: profile } })
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>(`${userSelect} WHERE u.id = ? LIMIT 1`, [
      req.auth?.uid,
    ])
    const user = rows[0]
    if (!user) {
      res.status(401).json({ message: '登录已过期' })
      return
    }
    const profile: PublicUser = {
      id: Number(user.id),
      username: String(user.username),
      nickname: String(user.nickname),
      roleCode: String(user.role_code),
      roleName: String(user.role_name),
    }
    res.json({ data: profile })
  }),
)
