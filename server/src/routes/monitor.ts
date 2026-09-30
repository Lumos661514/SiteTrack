import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { config } from '../config'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import { requireMenu } from '../middleware/permission'
import { asyncHandler } from '../utils/asyncHandler'
import { readPage } from '../utils/page'

interface IncomingEvent {
  kind?: string
  type?: string
  name?: string
  message?: string
  stack?: string
  filename?: string
  value?: number
  page?: string
  time?: number
}

const errorTypes = new Set(['js', 'promise', 'resource', 'blank'])
const metricNames = new Set(['FCP', 'LCP', 'INP', 'CLS'])

function formatDate(time: number) {
  const date = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  const valid = Number.isNaN(date.getTime()) ? new Date() : date
  return `${valid.getFullYear()}-${pad(valid.getMonth() + 1)}-${pad(valid.getDate())} ${pad(valid.getHours())}:${pad(valid.getMinutes())}:${pad(valid.getSeconds())}`
}

function clip(value: unknown, max: number) {
  return String(value ?? '').slice(0, max)
}

export const monitorRouter = Router()

monitorRouter.post(
  '/report',
  asyncHandler(async (req, res) => {
    if (req.body?.appKey !== config.monitorAppKey) {
      res.status(401).json({ message: '上报密钥不正确' })
      return
    }
    const events = Array.isArray(req.body?.events) ? (req.body.events as IncomingEvent[]) : []
    if (!events.length) {
      res.status(400).json({ message: '没有上报内容' })
      return
    }
    const errors: unknown[][] = []
    const metrics: unknown[][] = []
    const pages: unknown[][] = []
    for (const event of events.slice(0, 100)) {
      const page = clip(event.page, 255)
      const createdAt = formatDate(Number(event.time))
      if (event.kind === 'error' && errorTypes.has(String(event.type))) {
        errors.push([
          event.type,
          clip(event.message, 500) || '未知错误',
          clip(event.stack, 4000),
          clip(event.filename, 255),
          page,
          createdAt,
        ])
      } else if (event.kind === 'metric' && metricNames.has(String(event.name))) {
        metrics.push([event.name, Number(event.value) || 0, page, createdAt])
      } else if (event.kind === 'pv' && page) {
        pages.push([page, createdAt])
      }
    }
    if (errors.length) {
      await pool.query<ResultSetHeader>(
        'INSERT INTO monitor_errors (type, message, stack, filename, page, created_at) VALUES ?',
        [errors],
      )
    }
    if (metrics.length) {
      await pool.query<ResultSetHeader>(
        'INSERT INTO monitor_metrics (name, value, page, created_at) VALUES ?',
        [metrics],
      )
    }
    if (pages.length) {
      await pool.query<ResultSetHeader>('INSERT INTO monitor_pages (page, created_at) VALUES ?', [pages])
    }
    res.json({ data: { accepted: errors.length + metrics.length + pages.length } })
  }),
)

monitorRouter.get(
  '/errors',
  requireAuth,
  requireMenu('/monitor'),
  asyncHandler(async (req, res) => {
    const { pageSize, offset } = readPage(req)
    const type = String(req.query.type ?? '').trim()
    const where = "WHERE (? = '' OR type = ?)"
    const params = [type, type]
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM monitor_errors ${where}`,
      params,
    )
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, type, message, page, filename, created_at
       FROM monitor_errors
       ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    )
    res.json({
      data: {
        list: rows.map((row) => ({
          id: Number(row.id),
          type: String(row.type),
          message: String(row.message),
          page: String(row.page),
          filename: String(row.filename ?? ''),
          createdAt:
            row.created_at instanceof Date
              ? formatDate(row.created_at.getTime())
              : String(row.created_at).replace('T', ' ').slice(0, 19),
        })),
        total: Number(countRows[0]?.total ?? 0),
      },
    })
  }),
)

monitorRouter.get(
  '/summary',
  requireAuth,
  requireMenu('/monitor'),
  asyncHandler(async (_req, res) => {
    const [metricRows] = await pool.query<RowDataPacket[]>(
      `SELECT name, AVG(value) AS avg_value, COUNT(*) AS sample_count
       FROM monitor_metrics
       GROUP BY name`,
    )
    const [pageRows] = await pool.query<RowDataPacket[]>(
      `SELECT page, COUNT(*) AS view_count
       FROM monitor_pages
       GROUP BY page
       ORDER BY view_count DESC
       LIMIT 20`,
    )
    res.json({
      data: {
        metrics: metricRows.map((row) => ({
          name: String(row.name),
          avg: Math.round(Number(row.avg_value) * 1000) / 1000,
          count: Number(row.sample_count),
        })),
        pages: pageRows.map((row) => ({
          page: String(row.page),
          count: Number(row.view_count),
        })),
      },
    })
  }),
)
