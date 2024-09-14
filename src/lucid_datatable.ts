import { DataTableAbstract } from './datatable_abstract.js'
import { ModelQueryBuilder } from '@adonisjs/lucid/orm'
import { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import collect from 'collect.js'
import { sprintf } from 'sprintf-js'
import Helper from './utils/helper.js'
import { lcFirst } from './utils/function.js'
import { Exception } from '@adonisjs/core/exceptions'

export default class LucidDataTable extends DataTableAbstract {
  protected $nullsLast: boolean = false

  protected $prepared: boolean = false

  protected $keepSelectBindings: boolean = false

  protected $ignoreSelectInCountQuery: boolean = false

  protected $disableUserOrdering: boolean = false

  constructor(protected query: ModelQueryBuilderContract<LucidModel, any>) {
    super()
    this.$columns = query.columns
  }

  getPrimaryKeyName(): any {
    return this.query.model.primaryKey
  }

  protected getConnection() {
    return this.query.knexQuery.client
  }

  static canCreate(source: any): boolean {
    return source instanceof ModelQueryBuilder
  }

  async toJson(): Promise<Record<string, any> | void> {
    try {
      const query = await this.prepareQuery()
      const results = await query.results()
      const processed = await this.processResults(results)

      return this.render(processed)
    } catch (error) {
      return this.errorResponse(error)
    }
  }

  async results<Result>(): Promise<Result[]> {
    return await this.query.exec()
  }

  async prepareQuery(): Promise<this> {
    if (!this.$prepared) {
      this.$totalRecords = await this.totalCount()

      this.filterRecords()
      this.ordering()
      this.paginate()
    }

    this.$prepared = true

    return this
  }

  async count(): Promise<number> {
    const query = await this.prepareCountQuery().count('id as total').first()
    return query.$extras.total
  }

  prepareCountQuery(): ModelQueryBuilder {
    const builder = this.query.clone() as ModelQueryBuilder

    // if ($this.isComplexQuery($builder)) {
    //     $builder.select(DB::raw('1 as dt_row_count'));
    //     $clone = $builder->clone();
    //     $clone->setBindings([]);
    //     if ($clone instanceof EloquentBuilder) {
    //         $clone->getQuery()->wheres = [];
    //     } else {
    //         $clone->wheres = [];
    //     }

    //     if ($this->isComplexQuery($clone)) {
    //         if (! $this->ignoreSelectInCountQuery) {
    //             $builder = clone $this->query;
    //         }

    //         return $this->getConnection()
    //             ->query()
    //             ->fromRaw('('.$builder->toSql().') count_row_table')
    //             ->setBindings($builder->getBindings());
    //     }
    // }
    builder.select(this.getConnection().raw("'1' as row_count"))

    // if (! this.$keepSelectBindings) {
    //     builder.binsetBindings([], 'select');
    // }

    return builder
  }

  filterRecords(): void {
    const initialQuery = this.query.clone()

    if (this.request.isSearchable()) {
      this.filtering()
    }

    this.columnSearch()
    // this.searchPanesSearch();

    if (!this.$skipTotalRecords && this.query === initialQuery) {
      this.$filteredRecords ??= this.$totalRecords
    } else {
      this.filteredCount()

      if (this.$skipTotalRecords) {
        this.$totalRecords = this.$filteredRecords
      }
    }
  }

  columnSearch(): void {
    const columns = this.request.columns()

    for (let index = 0; index < columns.length; index++) {
      let column = this.getColumnName(index)

      if (column === null) {
        continue
      }

      if (
        !this.request.isColumnSearchable(index) ||
        (this.isBlacklisted(column) && !this.hasFilterColumn(column))
      ) {
        continue
      }

      if (this.hasFilterColumn(column)) {
        const keyword = this.getColumnSearchKeyword(index, true)
        this.applyFilterColumn(this.getBaseQueryBuilder(), column, keyword)
      } else {
        column = this.resolveRelationColumn(column)
        const keyword = this.getColumnSearchKeyword(index)
        this.compileColumnSearch(index, column, keyword)
      }
    }
  }

  hasFilterColumn(columnName: string): boolean {
    return this.$columnDef['filter'][columnName] !== undefined
  }

  wrapColumn(column: string) {
    return Helper.wrapColumn(column, true)
  }

  protected getColumnSearchKeyword(i: number, raw: boolean = false): string {
    const keyword = this.request.columnKeyword(i)
    if (raw || this.request.isRegex(i)) {
      return keyword
    }

    return this.setupKeyword(keyword)
  }

  protected applyFilterColumn(
    query: ModelQueryBuilderContract<LucidModel, any>,
    _columnName: string,
    _keyword: string,
    _boolean: string = 'and'
  ): void {
    query = this.getBaseQueryBuilder(query)
    // const callback: Function = this.$columnDef['filter'][columnName]['method'];

    // const builder = this.query.clone() as ModelQueryBuilder
    // console.log(builder.toQuery())

    // callback.apply(builder, keyword);

    // const baseQueryBuilder = this.getBaseQueryBuilder(builder)
    // query.addNestedWhereQuery(baseQueryBuilder, boolean)
  }

  getBaseQueryBuilder(
    instance: ModelQueryBuilderContract<LucidModel, any> | null = null
  ): ModelQueryBuilderContract<LucidModel, any> {
    if (!instance) {
      instance = this.query
    }

    return instance
  }

  getQuery(): ModelQueryBuilderContract<LucidModel, any> {
    return this.query
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

  protected compileColumnSearch(i: number, column: string, keyword: string): void {
    if (this.request.isRegex(i)) {
      this.regexColumnSearch(column, keyword)
    } else {
      this.compileQuerySearch(this.query, column, keyword, '')
    }
  }

  protected regexColumnSearch(column: string, keyword: string): void {
    column = this.wrapColumn(column)

    let sql: string = ''
    switch (this.getConnection().driverName) {
      case 'oracle':
        sql = !this.config.isCaseInsensitive()
          ? 'REGEXP_LIKE( ' + column + ' , ? )'
          : 'REGEXP_LIKE( LOWER(' + column + ") , ?, 'i' )"
        break

      case 'pgsql':
        // column = this.castColumn(column);
        sql = !this.config.isCaseInsensitive() ? column + ' ~ ?' : column + ' ~* ? '
        break

      default:
        sql = !this.config.isCaseInsensitive()
          ? column + ' REGEXP ?'
          : 'LOWER(' + column + ') REGEXP ?'
        keyword = keyword.toLowerCase()
    }

    this.query.whereRaw(sql, [keyword])
  }

  castColumn(column: string): string {
    const driverName = this.getConnection().driverName

    switch (driverName) {
      case 'pgsql':
        return `CAST(${column} AS TEXT)`
      case 'firebird':
        return `CAST(${column} AS VARCHAR(255))`
      default:
        return column
    }
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
      return this.compileQuerySearchRaw(query, columnName, keyword, boolean)
    }

    const method: string = lcFirst(`${boolean}WhereHas`)
    ;(query as any)[method](relation, (model: ModelQueryBuilder) => {
      this.compileQuerySearchRaw(model, column, keyword, '')
    })
  }

  protected compileQuerySearchRaw(
    query: ModelQueryBuilderContract<LucidModel, any>,
    columnName: string,
    keyword: string,
    boolean: string = 'or'
  ): void {
    let column = this.addTablePrefix(query, columnName)
    column = this.castColumn(column)
    let sql = column + ' LIKE ?'

    if (this.config.isCaseInsensitive()) {
      sql = 'LOWER(' + column + ') LIKE ?'
    }
    const method: string = lcFirst(`${boolean}WhereRaw`)
    ;(query as any)[method](sql, [`%${keyword}%`])
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

  addTablePrefix(query: ModelQueryBuilderContract<LucidModel, any>, column: string): string {
    if (!column.includes('.')) {
      const q = this.getBaseQueryBuilder(query)
      let from: string = q.model.table || ''

      if (typeof from === 'string') {
        if (from.includes(' as ')) {
          from = from.split(' as ')[1] as string
        }
        column = `${from}.${column}`
      }
    }

    return this.wrapColumn(column)
  }

  protected prepareKeyword(keyword: string): string {
    if (this.config.isCaseInsensitive()) {
      keyword = keyword.toLowerCase()
    }

    if (this.config.isStartsWithSearch()) {
      return `${keyword}%`
    }

    if (this.config.isWildcard()) {
      keyword = Helper.wildcardString(keyword, '%')
    }

    if (this.config.isSmartSearch()) {
      keyword = `%${keyword}%`
    }

    return keyword
  }

  filterColumn(column: string, callback: CallableFunction): this {
    this.$columnDef['filter'][column] = { method: callback }

    return this
  }

  orderColumns(columns: Record<string, any>, sql: string, bindings: any[] = []): this {
    for (const column of Object.values(columns)) {
      this.orderColumn(column, sql.replace(':column', column), bindings)
    }

    return this
  }

  orderColumn(column: string, sql: string, bindings: any[] = []): this {
    this.$columnDef['order'][column] = [sql, bindings]

    return this
  }

  orderByNullsLast(): this {
    this.$nullsLast = true

    return this
  }

  paging(): void {
    const start = this.request.start()
    const length = this.request.length()
    const limit = length > 0 ? length : 10

    this.query.offset(start).limit(limit)
  }

  addColumn(
    name: string,
    content:
      | (<T extends abstract new (...args: any) => any>(row: InstanceType<T>) => string | number)
      | string
      | number,
    order = false
  ): this {
    this.pushToBlacklist(name)

    return super.addColumn(name, content, order)
  }

  defaultOrdering(): any {
    const self = this
    collect(this.request.orderableColumns())
      .map(function (orderable: Record<string, any>) {
        orderable['name'] = self.getColumnName(orderable['column'], true)

        return orderable
      })
      .reject(
        (orderable: Record<string, any>) =>
          self.isBlacklisted(orderable['name']) && !self.hasOrderColumn(orderable['name'])
      )
      .each(function (orderable: Record<string, any>) {
        const column = self.resolveRelationColumn(orderable['name'])

        if (self.hasOrderColumn(orderable['name'])) {
          self.applyOrderColumn(orderable['name'], orderable)
        } else if (self.hasOrderColumn(column)) {
          self.applyOrderColumn(column, orderable)
        } else {
          const nullsLastSql = self.getNullsLastSql(column, orderable['direction'])
          const normalSql = self.wrapColumn(column) + ' ' + orderable['direction']
          const sql = self.$nullsLast ? nullsLastSql : normalSql
          self.query.orderByRaw(sql)
          console.log(self.query.toQuery())
        }
      })
  }

  protected hasOrderColumn(column: string): boolean {
    return this.$columnDef['order'][column] !== undefined
  }

  protected applyOrderColumn(column: string, orderable: Record<string, any>): void {
    let sql = this.$columnDef['order'][column]['sql']
    if (sql === false) {
      return
    }

    if (typeof sql === 'function') {
      sql.apply(this.query, orderable['direction'])
    } else {
      sql = sql.replace('$1', orderable['direction'])
      const bindings = this.$columnDef['order'][column]['bindings']
      this.query.orderByRaw(sql, bindings)
    }
  }

  protected getNullsLastSql(column: string, direction: string): string {
    const sql = this.config.get('datatables.nulls_last_sql', '%s %s NULLS LAST')

    return sprintf(sql, column, direction)
      .replace(':column', column)
      .replace(':direction', direction)
  }

  globalSearch(keyword: string): void {
    const self = this

    const getColumName = (index: number) => super.getColumnName(index)
    this.query.where(function (query: ModelQueryBuilder) {
      collect(self.request.searchableColumnIndex())
        .map(getColumName)
        .filter(() => true)
        .reject(
          (column) =>
            self.isBlacklisted(column as string) && !self.hasFilterColumn(column as string)
        )
        .each(function (column) {
          if (self.hasFilterColumn(column as string)) {
            self.applyFilterColumn(query, column as string, keyword, 'or')
          } else {
            self.compileQuerySearch(query, column as string, keyword)
          }
        })
    })
  }

  protected attachAppends(data: Record<string, any>): Record<string, any> {
    const appends: Record<string, any> = {}
    for (const [key, value] of Object.entries(this.$appends)) {
      if (typeof value === 'function') {
        appends[key] = Helper.value(value(this.getFilteredQuery()))
      } else {
        appends[key] = value
      }
    }

    // Set flag to disable ordering
    appends['disableOrdering'] = this.$disableUserOrdering

    return { ...data, ...appends }
  }

  getFilteredQuery(): ModelQueryBuilderContract<LucidModel, any> {
    this.prepareQuery()

    return this.query
  }

  ignoreSelectsInCountQuery(): this {
    this.$ignoreSelectInCountQuery = true

    return this
  }

  ordering(): void {
    if (this.$disableUserOrdering) {
      return
    }

    super.ordering()
  }

  protected joinEagerLoadedColumn(relation: string, relationColumn: string) {
    let tableName: string = ''
    let foreignKey: string
    let ownerKey: string
    let lastQuery = this.query

    const relations = relation.split('.')
    for (const eachRelation of Object.values(relations)) {
      const model = lastQuery.model.$getRelation(eachRelation)
      // console.log(model.type, model.relatedModel(), model)
      switch (true) {
        // case model instanceof BelongsToMany:
        // $pivot   = $model->getTable();
        // $pivotPK = $model->getExistenceCompareKey();
        // $pivotFK = $model->getQualifiedParentKeyName();
        // $this->performJoin($pivot, $pivotPK, $pivotFK);

        // $related = $model->getRelated();
        // $table   = $related->getTable();
        // $tablePK = $related->getForeignKey();
        // $foreign = $pivot . '.' . $tablePK;
        // $other   = $related->getQualifiedKeyName();

        // $lastQuery->addSelect($table . '.' . $relationColumn);
        // $this->performJoin($table, $foreign, $other);

        // break;

        // case model instanceof HasOneThrough:
        // $pivot    = explode('.', $model->getQualifiedParentKeyName())[0]; // extract pivot table from key
        // $pivotPK  = $pivot . '.' . $model->getFirstKeyName();
        // $pivotFK  = $model->getQualifiedLocalKeyName();
        // $this->performJoin($pivot, $pivotPK, $pivotFK);

        // $related = $model->getRelated();
        // $table   = $related->getTable();
        // $tablePK = $model->getSecondLocalKeyName();
        // $foreign = $pivot . '.' . $tablePK;
        // $other   = $related->getQualifiedKeyName();

        // $lastQuery->addSelect($lastQuery->getModel()->getTable().'.*');

        // break;

        case model.type === 'hasOne':
          tableName = model.relatedModel().table
          foreignKey = `${tableName}.${model.foreignKeyColumnName}`
          ownerKey = `${this.query.model.table}.${model.localKeyColumnName}`
          break

        case model.type === 'belongsTo':
          tableName = model.relatedModel().table
          foreignKey = `${this.query.model.table}.${model.foreignKeyColumnName}`
          ownerKey = `${tableName}.${model.localKeyColumnName}`
          break

        default:
          throw new Exception(`Relation ${model} is not yet supported.`)
      }
      // console.log(tableName, foreignKey, ownerKey)
      this.performJoin(tableName, foreignKey, ownerKey)

      lastQuery = this.query
    }

    return `${tableName}.${relationColumn}`
  }

  protected performJoin(table: string, foreign: string, other: string): void {
    this.getBaseQueryBuilder().leftJoin(table, foreign, '=', other)
  }

  protected applyFixedOrderingToQuery(_keyName: string, _orderedKeys: string[]): void {}
}
