import { Router } from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'

export const dashboardRouter = Router()

dashboardRouter.get(
  '/summary',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(*) FROM orders) AS order_count,
        (SELECT COUNT(*) FROM products) AS product_count,
        (SELECT COUNT(*) FROM users) AS user_count
    `)
    const row = rows[0]
    res.json({
      data: {
        orderCount: Number(row?.order_count ?? 0),
        productCount: Number(row?.product_count ?? 0),
        userCount: Number(row?.user_count ?? 0),
      },
    })
  }),
)
