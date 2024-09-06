import { Request } from '@adonisjs/core/http'

declare module '@adonisjs/core/http' {
  interface Request {
    inputNested(key: string, defaultValue?: any): string
  }
}

Request.macro('inputNested', function (this: Request, key: string, defaultValue = null) {
  const keys = key.split('.')

  const columns: { [key: string]: any } = this.input(keys[0])
  if (!columns) {
    return defaultValue
  }

  keys.shift()
  const value = keys.reduce((acc, curr) => acc && acc[curr], columns)

  return value
})
