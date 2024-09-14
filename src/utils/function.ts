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

export function objectIncludeIn(item: any, array: Record<string, any>): Record<string, any> {
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

export function isEmpty(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    value === false ||
    value === 0 ||
    value === '' ||
    value === '0' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
  )
}

export function lcFirst(string: string) {
  if (typeof string !== 'string') {
    return ''
  }

  if (string.length === 0) {
    return string
  }

  return string[0].toLowerCase() + string.slice(1)
}
