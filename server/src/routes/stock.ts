import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import { requirePerm } from '../middleware/permission'
import { asyncHandler } from '../utils/asyncHandler'
import { readPage } from '../utils/page'

export const stockRouter = Router()

stockRouter.use(requireAuth)

function formatDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

stockRouter.get(
  '/',
  requirePerm('stock:list'),
  asyncHandler(async (req, res) => {
    const { pageSize, offset } = readPage(req)
    const keyword = String(req.query.keyword ?? '').trim()
    const lowOnly = req.query.lowOnly === '1'
    const where = `
      WHERE (? = '' OR p.name LIKE CONCAT('%', ?, '%'))
        AND (? = 0 OR p.stock < p.warning_stock)
    `
    const params = [keyword, keyword, lowOnly ? 1 : 0]
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM products p ${where}`,
      params,
    )
    const [lowRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM products WHERE stock < warning_stock',
    )
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.name, p.stock, p.warning_stock, c.name AS category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY (p.stock < p.warning_stock) DESC, p.id ASC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    )
    res.json({
      data: {
        list: rows.map((row) => ({
          id: Number(row.id),
          name: String(row.name),
          categoryName: String(row.category_name),
          stock: Number(row.stock),
          warningStock: Number(row.warning_stock),
          low: Number(row.stock) < Number(row.warning_stock),
        })),
        total: Number(countRows[0]?.total ?? 0),
        lowCount: Number(lowRows[0]?.total ?? 0),
      },
    })
  }),
)

stockRouter.get(
  '/logs',
  requirePerm('stock:log'),
  asyncHandler(async (req, res) => {
    const { pageSize, offset } = readPage(req)
    const productId = req.query.productId ? Number(req.query.productId) : null
    const where = 'WHERE (? IS NULL OR l.product_id = ?)'
    const params = [productId, productId]
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM stock_logs l ${where}`,
      params,
    )
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT l.id, l.product_id, l.type, l.quantity, l.remark, l.created_at, p.name AS product_name
       FROM stock_logs l
       JOIN products p ON p.id = l.product_id
       ${where}
       ORDER BY l.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    )
    res.json({
      data: {
        list: rows.map((row) => ({
          id: Number(row.id),
          productId: Number(row.product_id),
          productName: String(row.product_name),
          type: String(row.type),
          quantity: Number(row.quantity),
          remark: String(row.remark ?? ''),
          createdAt: formatDate(row.created_at),
        })),
        total: Number(countRows[0]?.total ?? 0),
      },
    })
  }),
)

stockRouter.post(
  '/movements',
  requirePerm('stock:list'),
  asyncHandler(async (req, res) => {
    const productId = Number(req.body?.productId)
    const type = req.body?.type === 'out' ? 'out' : req.body?.type === 'in' ? 'in' : ''
    const quantity = Number(req.body?.quantity)
    const remark = String(req.body?.remark ?? '').trim()
    if (!productId || !type || !Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({ message: '请填写商品、方向和正整数数量' })
      return
    }
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT stock FROM products WHERE id = ? FOR UPDATE',
        [productId],
      )
      const product = rows[0]
      if (!product) {
        await connection.rollback()
        res.status(404).json({ message: '商品不存在' })
        return
      }
      const stock = Number(product.stock)
      if (type === 'out' && stock < quantity) {
        await connection.rollback()
        res.status(400).json({ message: '库存不足' })
        return
      }
      const nextStock = type === 'in' ? stock + quantity : stock - quantity
      await connection.query('UPDATE products SET stock = ? WHERE id = ?', [nextStock, productId])
      await connection.query<ResultSetHeader>(
        'INSERT INTO stock_logs (product_id, type, quantity, remark, created_at) VALUES (?, ?, ?, ?, NOW())',
        [productId, type, quantity, remark || (type === 'in' ? '手动入库' : '手动出库')],
      )
      await connection.commit()
      res.json({ data: { stock: nextStock } })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }),
)
