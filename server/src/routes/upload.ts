import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { requirePerm } from '../middleware/permission'

const uploadDir = fileURLToPath(new URL('../../uploads', import.meta.url))
mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase()
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`)
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      callback(new Error('只支持 jpg、png、webp、gif'))
      return
    }
    callback(null, true)
  },
})

export const uploadRouter = Router()

uploadRouter.post(
  '/',
  requireAuth,
  requirePerm('product:add', 'product:edit'),
  (req, res) => {
    upload.single('file')(req, res, (error) => {
      if (error) {
        res.status(400).json({ message: error instanceof Error ? error.message : '上传失败' })
        return
      }
      if (!req.file) {
        res.status(400).json({ message: '请选择图片' })
        return
      }
      res.json({ data: { url: `/api/uploads/${req.file.filename}` } })
    })
  },
)

export { uploadDir }
