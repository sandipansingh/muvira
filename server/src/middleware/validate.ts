import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

interface ValidateSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

export function validate(schemas: ValidateSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {}

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body)
      if (!result.success) {
        mergeZodErrors(errors, result.error, 'body')
      } else {
        req.body = result.data as Record<string, unknown> // Replace with parsed (strips unknown fields)
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query)
      if (!result.success) {
        mergeZodErrors(errors, result.error, 'query')
      } else {
        // Safe cast: Zod-parsed query is always string-keyed
        req.query = result.data as typeof req.query
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params)
      if (!result.success) {
        mergeZodErrors(errors, result.error, 'params')
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          fieldErrors: errors,
        },
      })
      return
    }

    next()
  }
}

function mergeZodErrors(
  target: Record<string, string[]>,
  zodError: ZodError,
  prefix: string
): void {
  for (const issue of zodError.issues) {
    const key = issue.path.length > 0 ? `${prefix}.${issue.path.join('.')}` : prefix
    if (!target[key]) target[key] = []
    target[key]!.push(issue.message)
  }
}
