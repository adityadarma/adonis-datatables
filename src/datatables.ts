import { Exception } from '@adonisjs/core/exceptions'

export default class Datatables {
  constructor(protected engines: Record<string, any>) {}

  of<T>(...source: any[]) {
    for (const engine of Object.values(this.engines)) {
      const canCreate = engine.canCreate as Function

      if (typeof canCreate === 'function' && canCreate.apply(engine, source)) {
        const create = engine.create as Function

        if (typeof create === 'function') {
          return create.apply(engine, source) as T
        }
      }
    }

    throw new Exception('No available engine run')
  }
}
