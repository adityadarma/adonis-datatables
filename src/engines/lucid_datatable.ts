import { ModelQueryBuilder } from '@adonisjs/lucid/orm'
import { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import lodash from 'lodash'
import { Exception } from '@adonisjs/core/exceptions'
import DatabaseDataTable from './database_datatable.js'

export default class LucidDataTable extends DatabaseDataTable {
  constructor(protected query: ModelQueryBuilderContract<LucidModel, any>) {
    super(query)
  }

  protected compileQuerySearch(
    query: ModelQueryBuilderContract<LucidModel, any>,
    columnName: string,
    keyword: string,
    boolean: string = 'or'
  ): void {
    const parts = columnName.split('.')
    const column = parts.pop() as string
    const relation = parts.join('.')

    if (this.isNotEagerLoaded(relation)) {
      return super.compileQuerySearch(query, columnName, keyword, boolean)
    }

    const method: string = lodash.lowerFirst(`${boolean}WhereHas`)
    ;(query as any)[method](relation, (model: ModelQueryBuilder) => {
      super.compileQuerySearch(model, column, keyword, '')
    })
  }

  protected isNotEagerLoaded(relation: string) {
    return (
      relation === '' ||
      !Object.keys(Object.fromEntries(this.query.model['$relationsDefinitions'])).includes(
        relation
      ) ||
      relation === this.query.model.name
    )
  }

  protected resolveRelationColumn(column: string): string {
    const parts = column.split('.')
    const columnName = parts.pop() as string
    const relation = parts.join('.')

    if (this.isNotEagerLoaded(relation)) {
      return column
    }

    return this.joinEagerLoadedColumn(relation, columnName)
  }

  protected joinEagerLoadedColumn(relation: string, relationColumn: string) {
    let tableName: string = ''
    let foreignKey: string
    let ownerKey: string
    let lastQuery = this.query

    const relations = relation.split('.')
    for (const eachRelation of Object.values(relations)) {
      const model = lastQuery.model.$getRelation(eachRelation)
      switch (true) {
        case model.type === 'belongsTo':
          tableName = model.relatedModel().table
          foreignKey = `${this.query.model.table}.${model.foreignKeyColumnName}`
          ownerKey = `${tableName}.${model.localKeyColumnName}`
          break

        default:
          throw new Exception(`Relation ${eachRelation} is not yet supported.`)
      }
      this.performJoin(tableName, foreignKey, ownerKey)

      lastQuery = this.query
    }

    return `${tableName}.${relationColumn}`
  }

  protected performJoin(table: string, foreign: string, other: string): void {
    this.getBaseQueryBuilder().leftJoin(table, foreign, '=', other)
  }

  protected getPrimaryKeyName(): any {
    return this.query.model.primaryKey
  }

  static canCreate(source: any): boolean {
    return source instanceof ModelQueryBuilder
  }

  async count(): Promise<number> {
    const builder = this.query.clone() as ModelQueryBuilder
    const result = await builder.exec()
    return result.length
  }
}
