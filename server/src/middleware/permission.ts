// 【面试重点】接口权限
// 解决的问题：按钮可以用开发者工具加回来，只在前端隐藏等于没做权限。
// 为什么这样设计：权限码存在 menus.perm，通过角色和菜单的关联表判断。和前端 v-permission 用同一套码，但以这次数据库查询为准。

import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { asyncHandler } from '../utils/asyncHandler'

export async function userHasAnyPerm(uid: number, perms: string[]) {
  if (!perms.length) return false
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 AS ok
     FROM users u
     JOIN role_menus rm ON rm.role_id = u.role_id
     JOIN menus m ON m.id = rm.menu_id
     WHERE u.id = ? AND m.perm IN (?)
     LIMIT 1`,
    [uid, perms],
  )
  return rows.length > 0
}

export function requirePerm(...perms: string[]) {
  return asyncHandler(async (req, res, next) => {
    const uid = req.auth?.uid
    if (!uid || !(await userHasAnyPerm(uid, perms))) {
      res.status(403).json({ message: '没有权限' })
      return
    }
    next()
  })
}

export async function userPermSet(uid: number, perms: string[]) {
  if (!perms.length) return new Set<string>()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT m.perm
     FROM users u
     JOIN role_menus rm ON rm.role_id = u.role_id
     JOIN menus m ON m.id = rm.menu_id
     WHERE u.id = ? AND m.perm IN (?)`,
    [uid, perms],
  )
  return new Set(rows.map((row) => String(row.perm)))
}

/** 数据看板这类菜单没有按钮权限码，按菜单路径判断角色能不能进。 */
export function requireMenu(path: string) {
  return asyncHandler(async (req, res, next) => {
    const uid = req.auth?.uid
    if (!uid) {
      res.status(401).json({ message: '未登录' })
      return
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 AS ok
       FROM users u
       JOIN role_menus rm ON rm.role_id = u.role_id
       JOIN menus m ON m.id = rm.menu_id
       WHERE u.id = ? AND m.path = ?
       LIMIT 1`,
      [uid, path],
    )
    if (!rows.length) {
      res.status(403).json({ message: '没有权限' })
      return
    }
    next()
  })
}
