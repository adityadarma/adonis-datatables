import { Exception } from '@adonisjs/core/exceptions'
import { Engines } from './contracts/config.js'
// import { DataTableAbstract } from './datatable_abstract.js'
// import { DataTableAbstract } from './datatable_abstract.js'

export default class Datatables {
  protected engines: Engines

  constructor(engines: Engines) {
    this.engines = engines
  }

  of(...source: any[]) {
    for (const engine of Object.values(this.engines)) {
      const canCreate = engine.canCreate as Function

      if (typeof canCreate === 'function' && canCreate.apply(engine, source)) {
        const create = engine.create as Function

        if (typeof create === 'function') {
          return create.apply(engine, source)
        }
      }
    }

    throw new Exception('No available engine run')
  }
}
