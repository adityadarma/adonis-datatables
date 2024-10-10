import lodash from 'lodash'
import { Edge } from 'edge.js'

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

  static serializeToObject(row: Record<string, any>): Record<string, any> {
    if (row && typeof row['serialize'] === 'function' && typeof row === 'object') {
      row.serializeExtras = () => row.$extras
      let data: Record<string, any> = row.serialize()

      if (typeof row['serializeRelations'] === 'function') {
        for (const [relationName, relation] of Object.entries(row.serializeRelations())) {
          if (Array.isArray(relation)) {
            const items: Record<string, any>[] = []
            for (const relationItem of Object.values(row.$getRelated(relationName))) {
              items.push(Helper.serializeToObject(relationItem as Record<string, any>))
            }
            data[relationName] = items
          } else {
            data[relationName] = Helper.serializeToObject(row.$getRelated(relationName))
          }
        }
      }

      return data
    }

    return row
  }

  static compileContent(
    content:
      | (<T extends abstract new (...args: any) => any>(row: InstanceType<T>) => string | number)
      | string
      | number,
    data: Record<string, any>,
    row: Record<string, any> | any[]
  ) {
    if (typeof content === 'string') {
      return Helper.compileView(content, Helper.getMixedValue(data, row))
    }

    if (typeof content === 'function') {
      return content(row)
    }

    return content
  }

  static compileView(content: string, data: Record<string, any>) {
    const edge = Edge.create()

    return edge.renderRawSync(content, data)
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
    const casted = Helper.toObject(param)

    data['model'] = param

    for (const key of Object.keys(data)) {
      if (casted[key] !== undefined) {
        data[key] = casted[key]
      }
    }
    lodash.unset(data, 'model')

    return data
  }

  static toObject(param: Record<string, any>): Record<string, any> {
    if (typeof param['toJSON'] === 'function' && typeof param === 'object') {
      return param.toJSON()
    }

    if (Array.isArray(param)) {
      return Object.assign({}, param)
    }

    return param
  }

  static dot(object: Record<string, any>, prepend = ''): Record<string, any> {
    let results: Record<string, any> = {}

    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const value = object[key]
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          Object.keys(value).length > 0
        ) {
          results = { ...results, ...Helper.dot(value, `${prepend}${key}.`) }
        } else {
          results[`${prepend}${key}`] = value
        }
      }
    }

    return results
  }

  static contains(
    haystack: string,
    needles: string | string[],
    ignoreCase: boolean = false
  ): boolean {
    if (ignoreCase) {
      haystack = haystack.toLowerCase()
    }

    if (!Array.isArray(needles)) {
      needles = [needles]
    }

    for (let needle of needles) {
      if (ignoreCase) {
        needle = needle.toLowerCase()
      }

      if (needle !== '' && haystack.includes(needle)) {
        return true
      }
    }

    return false
  }

  static objectIncludeIn(item: any, data: Record<string, any>): Record<string, any> {
    const isItemOrderInvalid = (i: { order: number }, a: Record<string, any>) => {
      return i.order >= Object.keys(a).length
    }

    if (isItemOrderInvalid(item, data)) {
      return { ...data, [item.name]: item.content }
    }

    let count = 0
    const first: Record<string, any> = {}
    const last = { ...data }

    for (const key in data) {
      if (count === item.order) {
        continue
      }

      delete last[key]
      first[key] = data[key]
      count++
    }

    return { ...first, [item.name]: item.content, ...last }
  }

  static objectIntersectKey<T>(array: Record<string, T>, keys: string[]): Record<string, T> {
    return Object.keys(array)
      .filter((key) => keys.includes(key))
      .reduce(
        (result, key) => {
          result[key] = array[key]
          return result
        },
        {} as Record<string, T>
      )
  }

  static objectReplaceRecursive(
    target: Record<string, any>,
    source: Record<string, any>
  ): Record<string, any> {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        target[key] = Helper.objectReplaceRecursive(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
    return target
  }
}
