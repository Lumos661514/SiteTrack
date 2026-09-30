import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import { requirePerm } from '../middleware/permission'
import { asyncHandler } from '../utils/asyncHandler'
import { readPage } from '../utils/page'

export const categoryRouter = Router()

categoryRouter.use(requireAuth)

categoryRouter.get(
  '/',
  requirePerm('product:list', 'product:category', 'product:add', 'product:edit'),
  asyncHandler(async (req, res) => {
    const { pageSize, offset } = readPage(req)
    const keyword = String(req.query.keyword ?? '').trim()
    const where = 'WHERE (? = \'\' OR c.name LIKE CONCAT(\'%\', ?, \'%\'))'
    const params = [keyword, keyword]
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM categories c ${where}`,
      params,
    )
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.name, c.sort,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c
       ${where}
       ORDER BY c.sort ASC, c.id ASC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    )
    res.json({
      data: {
        list: rows.map((row) => ({
          id: Number(row.id),
          name: String(row.name),
          sort: Number(row.sort),
          productCount: Number(row.product_count),
        })),
        total: Number(countRows[0]?.total ?? 0),
      },
    })
  }),
)

categoryRouter.post(
  '/',
  requirePerm('product:category'),
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name ?? '').trim()
    const sort = Number(req.body?.sort ?? 0)
    if (!name) {
      res.status(400).json({ message: '请填写分类名称' })
      return
    }
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO categories (name, sort) VALUES (?, ?)',
      [name, Number.isFinite(sort) ? sort : 0],
    )
    res.json({ data: { id: result.insertId } })
  }),
)

categoryRouter.put(
  '/:id',
  requirePerm('product:category'),
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name ?? '').trim()
    const sort = Number(req.body?.sort ?? 0)
    if (!name) {
      res.status(400).json({ message: '请填写分类名称' })
      return
    }
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE categories SET name = ?, sort = ? WHERE id = ?',
      [name, Number.isFinite(sort) ? sort : 0, Number(req.params.id)],
    )
    if (!result.affectedRows) {
      res.status(404).json({ message: '分类不存在' })
      return
    }
    res.json({ data: { ok: true } })
  }),
)

categoryRouter.delete(
  '/:id',
  requirePerm('product:category'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const [used] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM products WHERE category_id = ?',
      [id],
    )
    if (Number(used[0]?.total ?? 0) > 0) {
      res.status(400).json({ message: '分类下还有商品，不能删除' })
      return
    }
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM categories WHERE id = ?', [id])
    if (!result.affectedRows) {
      res.status(404).json({ message: '分类不存在' })
      return
    }
    res.json({ data: { ok: true } })
  }),
)
