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

export function strnatcasecmp(a: string, b: string): number {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
  return collator.compare(a, b)
}

export function strnatcmp(a: string, b: string): number {
  const collator = new Intl.Collator(undefined, { sensitivity: 'variant', numeric: true })
  return collator.compare(a, b)
}
