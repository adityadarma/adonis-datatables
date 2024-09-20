import { Exception } from '@adonisjs/core/exceptions'
import LucidDataTable from './engines/lucid_datatable.js'
import DatabaseDataTable from './engines/database_datatable.js'
import ObjectDataTable from './engines/object_datatable.js'
import { Collection } from 'collect.js'
import { DatabaseQueryBuilderContract, Dictionary } from '@adonisjs/lucid/types/querybuilder'
import { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export default class Datatables {
  constructor(protected engines: Record<string, any>) {}

  of<T>(...source: any): T {
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

  static lucid(source: ModelQueryBuilderContract<LucidModel, any>) {
    return LucidDataTable.create(source)
  }

  static database(source: DatabaseQueryBuilderContract<Dictionary<any, string>>) {
    return DatabaseDataTable.create(source)
  }

  static object(source: Record<string, any>[] | Collection<Record<string, any>>) {
    return ObjectDataTable.create(source as Collection<Record<string, any>>)
  }
}
