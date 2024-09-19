import { Exception } from '@adonisjs/core/exceptions'
import { ModelQueryBuilder } from '@adonisjs/lucid/orm'
import { DatabaseQueryBuilder } from '@adonisjs/lucid/database'
import LucidDataTable from './lucid_datatable.js'
import DatabaseDataTable from './database_datatable.js'
import ObjectDataTable from './object_datatable.js'
import { Collection } from 'collect.js'

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

  lucid(source: ModelQueryBuilder) {
    return new LucidDataTable(source)
  }

  database(source: DatabaseQueryBuilder) {
    return new DatabaseDataTable(source)
  }

  object(source: Collection<any>) {
    return new ObjectDataTable(source)
  }
}
