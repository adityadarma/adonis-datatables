import lodash from 'lodash'

export default class Obj {
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

  static value(defaultVal: any): any {
    return typeof defaultVal === 'function' ? defaultVal() : defaultVal
  }
}
