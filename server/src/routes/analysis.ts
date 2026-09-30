import { Router } from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import { requireMenu } from '../middleware/permission'
import { asyncHandler } from '../utils/asyncHandler'

export const analysisRouter = Router()

function dayText(offset: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - offset)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

analysisRouter.get(
  '/overview',
  requireAuth,
  requireMenu('/analysis'),
  asyncHandler(async (req, res) => {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30))
    const [trendRows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
              COUNT(*) AS order_count,
              SUM(CASE WHEN status <> 'cancelled' THEN amount ELSE 0 END) AS sales
       FROM orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`,
      [days - 1],
    )
    const trendMap = new Map(
      trendRows.map((row) => [
        String(row.day),
        { orderCount: Number(row.order_count), sales: Number(row.sales ?? 0) },
      ]),
    )
    const trend = Array.from({ length: days }, (_, index) => {
      const day = dayText(days - 1 - index)
      const item = trendMap.get(day)
      return {
        day,
        orderCount: item?.orderCount ?? 0,
        sales: Math.round((item?.sales ?? 0) * 100) / 100,
      }
    })

    const [rankingRows] = await pool.query<RowDataPacket[]>(
      `SELECT oi.product_name,
              SUM(oi.quantity) AS quantity,
              SUM(oi.price * oi.quantity) AS amount
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled'
       GROUP BY oi.product_id, oi.product_name
       ORDER BY quantity DESC
       LIMIT 10`,
    )
    res.json({
      data: {
        trend,
        ranking: rankingRows.map((row) => ({
          name: String(row.product_name),
          quantity: Number(row.quantity),
          amount: Math.round(Number(row.amount) * 100) / 100,
        })),
      },
    })
  }),
)
