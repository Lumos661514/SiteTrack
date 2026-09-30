import type { Request } from 'express'

export function readPage(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
  return { page, pageSize, offset: (page - 1) * pageSize }
}
