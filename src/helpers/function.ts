export function arrayIntersectKey<T>(array: Record<string, T>, keys: string[]): Record<string, T> {
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

export function arrayReplaceRecursive(
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, any> {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      target[key] = arrayReplaceRecursive(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  }
  return target
}

export function arrayMergeRecursive(
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, any> {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      target[key] = arrayMergeRecursive(target[key], source[key])
    } else if (Array.isArray(target[key]) && Array.isArray(source[key])) {
      target[key] = target[key].concat(source[key])
    } else {
      target[key] = source[key]
    }
  }
  return target
}

export function arrayIncludeIn(
  item: { name: string; content: any; order: number },
  array: Record<string, any>
): Record<string, any> {
  const isItemOrderInvalid = (i: { order: number }, a: Record<string, any>) => {
    return i.order >= Object.keys(a).length
  }

  if (isItemOrderInvalid(item, array)) {
    return { ...array, [item.name]: item.content }
  }

  let count = 0
  const first: Record<string, any> = {}
  const last = { ...array }

  for (const key in array) {
    if (count === item.order) {
      continue
    }

    delete last[key]
    first[key] = array[key]
    count++
  }

  return { ...first, [item.name]: item.content, ...last }
}

export function wildcardString(str: string, wildcard: string, lowercase: boolean = true): string {
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

export function extractColumnName(str: string, wantsAlias: boolean): string {
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

export function e(value: any): any {
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

export function wrap(value: string): string {
  if (value.includes(' as ')) {
    const [column, alias] = value.split(' as ')
    return `\`${column.trim()}\` as \`${alias.trim()}\``
  }

  return value
    .split('.')
    .map((segment) => `\`${toSnakeCase(segment)}\``)
    .join('.')
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Tambahkan underscore sebelum huruf besar
    .toLowerCase() // Ubah seluruh string menjadi huruf kecil
}
