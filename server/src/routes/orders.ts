import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { pool } from '../db'
import {
  findTransition,
  isOrderStatus,
  orderStatusText,
  visibleActions,
} from '../domain/orderState'
import { requireAuth } from '../middleware/auth'
import { requirePerm, userPermSet } from '../middleware/permission'
import { asyncHandler } from '../utils/asyncHandler'

export const orderRouter = Router()

orderRouter.use(requireAuth, requirePerm('order:list'))

function formatDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toOrder(row: RowDataPacket, perms: Set<string>) {
  const status = String(row.status)
  return {
    id: Number(row.id),
    orderNo: String(row.order_no),
    buyerName: String(row.buyer_name),
    amount: Number(row.amount),
    status,
    statusText: isOrderStatus(status) ? orderStatusText[status] : status,
    address: String(row.address ?? ''),
    createdAt: formatDate(row.created_at),
    actions: isOrderStatus(status) ? visibleActions(status, perms) : [],
  }
}

orderRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const orderNo = String(req.query.orderNo ?? '').trim()
    const buyer = String(req.query.buyer ?? '').trim()
    const status = String(req.query.status ?? '').trim()
    const where = `
      WHERE (? = '' OR order_no LIKE CONCAT(?, '%'))
        AND (? = '' OR buyer_name LIKE CONCAT('%', ?, '%'))
        AND (? = '' OR status = ?)
    `
    const params = [orderNo, orderNo, buyer, buyer, status, status]
    const withTotal = req.query.withTotal === '1'
    let total: number | undefined
    if (withTotal) {
      const [countRows] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM orders ${where}`,
        params,
      )
      total = Number(countRows[0]?.total ?? 0)
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, order_no, buyer_name, amount, status, address, created_at
       FROM orders
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    const perms = await userPermSet(req.auth!.uid, ['order:ship', 'order:cancel'])
    res.json({
      data: {
        list: rows.map((row) => toOrder(row, perms)),
        total,
      },
    })
  }),
)

orderRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, order_no, buyer_name, amount, status, address, created_at
       FROM orders WHERE id = ? LIMIT 1`,
      [id],
    )
    const row = rows[0]
    if (!row) {
      res.status(404).json({ message: '订单不存在' })
      return
    }
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT product_name, quantity, price FROM order_items WHERE order_id = ?`,
      [id],
    )
    const perms = await userPermSet(req.auth!.uid, ['order:ship', 'order:cancel'])
    res.json({
      data: {
        ...toOrder(row, perms),
        items: items.map((item) => ({
          productName: String(item.product_name),
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
      },
    })
  }),
)

orderRouter.post(
  '/:id/actions',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const action = String(req.body?.action ?? '')
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, status FROM orders WHERE id = ? LIMIT 1',
      [id],
    )
    const row = rows[0]
    if (!row) {
      res.status(404).json({ message: '订单不存在' })
      return
    }
    const status = String(row.status)
    if (!isOrderStatus(status)) {
      res.status(400).json({ message: '订单状态无效' })
      return
    }
    const transition = findTransition(status, action)
    if (!transition) {
      res.status(400).json({ message: '当前状态不能执行该操作' })
      return
    }
    if (transition.perm) {
      const perms = await userPermSet(req.auth!.uid, [transition.perm])
      if (!perms.has(transition.perm)) {
        res.status(403).json({ message: '没有权限' })
        return
      }
    }
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE orders SET status = ? WHERE id = ? AND status = ?',
      [transition.to, id, status],
    )
    if (!result.affectedRows) {
      res.status(400).json({ message: '订单状态已变化，请刷新' })
      return
    }
    res.json({ data: { status: transition.to, statusText: orderStatusText[transition.to] } })
  }),
)
