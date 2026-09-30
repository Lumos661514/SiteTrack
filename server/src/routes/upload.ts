import { mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { requirePerm } from '../middleware/permission'

const uploadDir = fileURLToPath(new URL('../../uploads', import.meta.url))
mkdirSync(uploadDir, { recursive: true })

const extByMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

function imageExtFromBytes(buf: Buffer) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg'
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return '.png'
  }
  const head = buf.subarray(0, 12).toString('ascii')
  if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return '.gif'
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return '.webp'
  return ''
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const ext = extByMime[file.mimetype] ?? '.bin'
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
      const filePath = path.join(uploadDir, req.file.filename)
      const sniffed = imageExtFromBytes(readFileSync(filePath).subarray(0, 16))
      const expected = extByMime[req.file.mimetype]
      if (!sniffed || sniffed !== expected) {
        unlinkSync(filePath)
        res.status(400).json({ message: '文件内容不是允许的图片' })
        return
      }
      res.json({ data: { url: `/api/uploads/${req.file.filename}` } })
    })
  },
)

export { uploadDir }
