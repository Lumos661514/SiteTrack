import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import { requirePerm } from '../middleware/permission'
import { asyncHandler } from '../utils/asyncHandler'
import { readPage } from '../utils/page'

interface Spec {
  name: string
  values: string[]
}

interface ProductInput {
  categoryId: number
  name: string
  price: number
  stock: number
  warningStock: number
  cover: string
  status: number
  specs: Spec[]
}

export const productRouter = Router()

productRouter.use(requireAuth)

function parseSpecs(value: unknown): Spec[] {
  let raw = value
  if (typeof raw === 'string' && raw) {
    try {
      raw = JSON.parse(raw) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const record = item as { name?: unknown; values?: unknown }
      const values = Array.isArray(record.values) ? record.values.map((value) => String(value).trim()) : []
      return { name: String(record.name ?? '').trim(), values: values.filter(Boolean) }
    })
    .filter((item) => item.name && item.values.length)
}

function toProduct(row: RowDataPacket) {
  return {
    id: Number(row.id),
    categoryId: Number(row.category_id),
    categoryName: String(row.category_name ?? ''),
    name: String(row.name),
    price: Number(row.price),
    stock: Number(row.stock),
    warningStock: Number(row.warning_stock),
    cover: String(row.cover ?? ''),
    status: Number(row.status),
    specs: parseSpecs(row.specs),
  }
}

function readProduct(body: unknown): ProductInput | null {
  const record = (body ?? {}) as Record<string, unknown>
  const name = String(record.name ?? '').trim()
  const categoryId = Number(record.categoryId)
  const price = Number(record.price)
  const stock = Number(record.stock ?? 0)
  const warningStock = Number(record.warningStock ?? 0)
  if (!name || !Number.isInteger(categoryId) || categoryId <= 0) return null
  if (!Number.isFinite(price) || price < 0) return null
  if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(warningStock) || warningStock < 0) {
    return null
  }
  return {
    name,
    categoryId,
    price,
    stock,
    warningStock,
    cover: String(record.cover ?? ''),
    status: Number(record.status) === 0 ? 0 : 1,
    specs: parseSpecs(record.specs),
  }
}

productRouter.get(
  '/',
  requirePerm('product:list'),
  asyncHandler(async (req, res) => {
    const { pageSize, offset } = readPage(req)
    const keyword = String(req.query.keyword ?? '').trim()
    const status =
      req.query.status === undefined || req.query.status === '' ? null : Number(req.query.status)
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null
    const where = `
      WHERE (? = '' OR p.name LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR p.status = ?)
        AND (? IS NULL OR p.category_id = ?)
    `
    const params = [keyword, keyword, status, status, categoryId, categoryId]
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM products p ${where}`,
      params,
    )
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, c.name AS category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    )
    res.json({
      data: {
        list: rows.map(toProduct),
        total: Number(countRows[0]?.total ?? 0),
      },
    })
  }),
)

productRouter.get(
  '/:id',
  requirePerm('product:edit', 'product:list'),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, c.name AS category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?
       LIMIT 1`,
      [Number(req.params.id)],
    )
    const row = rows[0]
    if (!row) {
      res.status(404).json({ message: '商品不存在' })
      return
    }
    res.json({ data: toProduct(row) })
  }),
)

productRouter.post(
  '/',
  requirePerm('product:add'),
  asyncHandler(async (req, res) => {
    const input = readProduct(req.body)
    if (!input) {
      res.status(400).json({ message: '请检查商品名称、分类、价格和库存' })
      return
    }
    const saved = await insertOrUpdate(input)
    if (!saved) {
      res.status(400).json({ message: '分类不存在' })
      return
    }
    res.json({ data: { id: saved } })
  }),
)

productRouter.put(
  '/:id',
  requirePerm('product:edit'),
  asyncHandler(async (req, res) => {
    const input = readProduct(req.body)
    if (!input) {
      res.status(400).json({ message: '请检查商品名称、分类、价格和库存' })
      return
    }
    const id = Number(req.params.id)
    const [category] = await pool.query<RowDataPacket[]>('SELECT id FROM categories WHERE id = ?', [
      input.categoryId,
    ])
    if (!category.length) {
      res.status(400).json({ message: '分类不存在' })
      return
    }
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE products
       SET category_id = ?, name = ?, price = ?, stock = ?, warning_stock = ?, cover = ?, status = ?, specs = ?
       WHERE id = ?`,
      [
        input.categoryId,
        input.name,
        input.price,
        input.stock,
        input.warningStock,
        input.cover,
        input.status,
        JSON.stringify(input.specs),
        id,
      ],
    )
    if (!result.affectedRows) {
      res.status(404).json({ message: '商品不存在' })
      return
    }
    res.json({ data: { ok: true } })
  }),
)

productRouter.patch(
  '/:id/status',
  requirePerm('product:status'),
  asyncHandler(async (req, res) => {
    const status = Number(req.body?.status) === 1 ? 1 : 0
    const [result] = await pool.query<ResultSetHeader>('UPDATE products SET status = ? WHERE id = ?', [
      status,
      Number(req.params.id),
    ])
    if (!result.affectedRows) {
      res.status(404).json({ message: '商品不存在' })
      return
    }
    res.json({ data: { ok: true } })
  }),
)

async function insertOrUpdate(input: ProductInput) {
  const [category] = await pool.query<RowDataPacket[]>('SELECT id FROM categories WHERE id = ?', [
    input.categoryId,
  ])
  if (!category.length) return 0
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO products (category_id, name, price, stock, warning_stock, cover, status, specs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.categoryId,
      input.name,
      input.price,
      input.stock,
      input.warningStock,
      input.cover,
      input.status,
      JSON.stringify(input.specs),
    ],
  )
  return result.insertId
}
