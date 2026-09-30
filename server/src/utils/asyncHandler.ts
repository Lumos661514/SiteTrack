import type { NextFunction, Request, Response } from 'express'

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/** Express 4 不会自动捕获 async 路由里的异常，这里统一交给错误中间件。 */
export function asyncHandler(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}
