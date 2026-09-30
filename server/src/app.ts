import cors from 'cors'
import express from 'express'
import { accessRouter } from './routes/access'
import { analysisRouter } from './routes/analysis'
import { authRouter } from './routes/auth'
import { categoryRouter } from './routes/categories'
import { dashboardRouter } from './routes/dashboard'
import { monitorRouter } from './routes/monitor'
import { orderRouter } from './routes/orders'
import { productRouter } from './routes/products'
import { stockRouter } from './routes/stock'
import { uploadDir, uploadRouter } from './routes/upload'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.use(
    '/api/uploads',
    express.static(uploadDir, {
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Content-Disposition', 'inline')
      },
    }),
  )
  app.get('/api/health', (_req, res) => {
    res.json({ data: { ok: true } })
  })
  app.use('/api/auth', authRouter)
  app.use('/api/auth', accessRouter)
  app.use('/api/dashboard', dashboardRouter)
  app.use('/api/products', productRouter)
  app.use('/api/categories', categoryRouter)
  app.use('/api/orders', orderRouter)
  app.use('/api/stock', stockRouter)
  app.use('/api/analysis', analysisRouter)
  app.use('/api/monitor', monitorRouter)
  app.use('/api/upload', uploadRouter)

  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error(error)
      res.status(500).json({ message: '服务器异常' })
    },
  )

  return app
}
