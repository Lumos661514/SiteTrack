import { Router } from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'

interface MenuRow extends RowDataPacket {
  id: number
  parent_id: number
  name: string
  path: string
  component: string
  icon: string
  perm: string
  type: number
  sort: number
}

interface MenuNode {
  id: number
  name: string
  path: string
  component: string
  icon: string
  children: MenuNode[]
}

export const accessRouter = Router()

accessRouter.get(
  '/menus',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query<MenuRow[]>(
      `SELECT m.id, m.parent_id, m.name, m.path, m.component, m.icon, m.perm, m.type, m.sort
       FROM menus m
       JOIN role_menus rm ON rm.menu_id = m.id
       JOIN users u ON u.role_id = rm.role_id
       WHERE u.id = ?
       ORDER BY m.sort ASC, m.id ASC`,
      [req.auth?.uid],
    )

    const permissions = rows.filter((row) => row.type === 2 && row.perm).map((row) => row.perm)
    const nodes = new Map<number, MenuNode>()
    for (const row of rows) {
      if (row.type !== 1) continue
      nodes.set(row.id, {
        id: row.id,
        name: row.name,
        path: row.path,
        component: row.component,
        icon: row.icon,
        children: [],
      })
    }

    const menus: MenuNode[] = []
    for (const row of rows) {
      if (row.type !== 1) continue
      const node = nodes.get(row.id)
      if (!node) continue
      const parent = nodes.get(row.parent_id)
      if (parent) parent.children.push(node)
      else menus.push(node)
    }

    res.json({ data: { menus, permissions } })
  }),
)
