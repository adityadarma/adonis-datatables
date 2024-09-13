import lodash from 'lodash'
import { Edge } from 'edge.js'
import app from '@adonisjs/core/services/app'
import { existsSync } from 'node:fs'

export default class Helper {
  static toSnakeCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
  }

  static wrapColumn(value: string, toSnackCase: boolean = true): string {
    if (value.includes(' as ')) {
      const [column, alias] = value.split(' as ')
      return `\`${column.trim()}\` as \`${alias.trim()}\``
    }

    return value
      .split('.')
      .map((segment) => `\`${toSnackCase ? Helper.toSnakeCase(segment) : segment}\``)
      .join('.')
  }

  static escape(value: any): any {
    if (typeof value === 'string') {
      return value.replace(/[&<>"']/g, (match) => {
        const escapeChars: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        }
        return escapeChars[match]
      })
    }
    return value
  }

  static extractColumnName(str: string, wantsAlias: boolean): string {
    const matches = str.toLowerCase().split(' as ')

    if (matches.length > 1) {
      if (wantsAlias) {
        return matches.pop() as string
      }

      return matches.shift() as string
    } else if (str.includes('.')) {
      const array = str.split('.')
      return array.pop() as string
    }

    return str
  }

  static wildcardString(str: string, wildcard: string, lowercase: boolean = true): string {
    let wild = wildcard
    const chars = [...str]

    if (chars.length > 0) {
      for (const char of chars) {
        wild += char + wildcard
      }
    }

    if (lowercase) {
      wild = wild.toLowerCase()
    }

    return wild
  }

  static set(obj: Record<string, any>, path: lodash.PropertyPath, value: any = null) {
    return lodash.set(obj, path, value)
  }

  static get(obj: Record<string, any>, path: string, defaultValue: any = null): any {
    return lodash.get(obj, path, defaultValue)
  }

  static only<T>(obj: Record<string, T>, keys: string[]): Record<string, T> {
    return Object.keys(obj)
      .filter((key) => keys.includes(key))
      .reduce(
        (result, key) => {
          result[key] = obj[key]
          return result
        },
        {} as Record<string, T>
      )
  }

  static value(
    defaultVal: <T extends abstract new (...args: any) => any>(arg: InstanceType<T>) => any | any,
    ...args: any
  ): any {
    return typeof defaultVal === 'function' ? defaultVal(args) : defaultVal
  }

  static convertToObject(row: Record<string, any>): Record<string, any> {
    if (typeof row['toJSON'] === 'function' && typeof row === 'object') {
      let data: Record<string, any> = row.toJSON()

      if (typeof row['serializeRelations'] === 'function') {
        for (const [relationName, relation] of Object.entries(row.serializeRelations())) {
          if (Array.isArray(relation)) {
            const items: Record<string, any>[] = []
            for (const relationItem of Object.values(row.$getRelated(relationName))) {
              items.push(Helper.convertToObject(relationItem as Record<string, any>))
            }
            data[relationName] = items
          } else {
            data[relationName] = Helper.convertToObject(row.$getRelated(relationName))
          }
        }
      }

      return data
    }

    let data: Record<string, any>
    console.log(row)
    data = row
    // row = typeof row == 'object' && (row.makeHidden as Function).apply(row) ? row.makeHidden(Arr::get($filters, 'hidden', [])) : row;
    // $row = is_object($row) && method_exists($row, 'makeVisible') ? $row->makeVisible(Arr::get($filters, 'visible',
    //     [])) : $row;

    // $data = $row instanceof Arrayable ? $row->toArray() : (array) $row;
    // foreach ($data as &$value) {
    //     if ((is_object($value) && ! $value instanceof DateTime) || is_array($value)) {
    //         $value = self::convertToArray($value);
    //     }

    //     unset($value);
    // }

    return data
  }

  static async compileContent(
    content:
      | (<T extends abstract new (...args: any) => any>(row: InstanceType<T>) => string | number)
      | string
      | number,
    data: Record<string, any>,
    row: Record<string, any> | any[]
  ) {
    if (typeof content === 'string') {
      return await Helper.compileView(content, Helper.getMixedValue(data, row))
    }

    if (typeof content === 'function') {
      return content(row)
    }

    return content
  }

  static async compileView(content: string, data: Record<string, any>) {
    const edge = Edge.create()
    if (typeof content === 'object') {
      if (existsSync(app.viewsPath((content as string).replace('.', '/') + '.edge'))) {
        app.viewsPath(content)

        return await edge.render(content, data)
      }
    }

    edge.renderRawSync(content, data)

    return Helper.escapeHTML(content)
  }

  static escapeHTML(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
  }

  static getMixedValue(data: Record<string, any>, param: Record<string, any>): Record<string, any> {
    const casted = Helper.castToObject(param)

    data['model'] = param

    for (const key of Object.keys(data)) {
      if (casted[key] !== undefined) {
        data[key] = casted[key]
      }
    }

    return data
  }

  static castToObject(param: Record<string, any>): Record<string, any> {
    if (typeof param['toJSON'] === 'function' && typeof param === 'object') {
      return param.toJSON()
    }

    return param
  }
}
