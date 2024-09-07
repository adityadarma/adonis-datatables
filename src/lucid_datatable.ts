import { DataTableAbstract } from './datatable_abstract.js'
import { ModelQueryBuilder } from '@adonisjs/lucid/orm'
import collect from 'collect.js'
import { wildcardString, wrap } from './helpers/function.js'
import Obj from './utils/obj.js'
import { sprintf } from 'sprintf-js'

export default class LucidDataTable extends DataTableAbstract {
  protected $nullsLast: boolean = false

  protected $prepared: boolean = false

  protected $limitCallback: Function | null = null

  protected $keepSelectBindings: boolean = false

  protected $ignoreSelectInCountQuery: boolean = false

  protected $disableUserOrdering: boolean = false

  constructor(protected query: ModelQueryBuilder) {
    super()
    this.$columns = query.columns
  }

  protected getConnection() {
    return this.query.knexQuery.client
  }

  static canCreate(source: any): boolean {
    return source instanceof ModelQueryBuilder
  }

  async make(dataSupport: boolean = true): Promise<any> {
    try {
      const query = await this.prepareQuery()
      const results = await query.results()

      const processed = this.processResults(results, dataSupport)
      // const data = this.transform(results, processed);

      return this.render(processed)
    } catch (error) {
      return this.errorResponse(error)
    }
  }

  async results(): Promise<any[]> {
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

    if (this.$autoFilter && this.request.isSearchable()) {
      this.filtering()
    }

    if (typeof this.$filterCallback === 'function') {
      this.$filterCallback.apply(this.resolveCallbackParameter())
    }

    this.columnSearch()
    // this.searchPanesSearch();

    // If no modification between the original query and the filtered one has been made
    // the filteredRecords equals the totalRecords
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

  wrap(column: string) {
    return wrap(column)
  }

  protected getColumnSearchKeyword(i: number, raw: boolean = false): string {
    const keyword = this.request.columnKeyword(i)
    if (raw || this.request.isRegex(i)) {
      return keyword
    }

    return this.setupKeyword(keyword)
  }

  filter(_callback: CallableFunction, _globalSearch: boolean): this {
    return this
  }

  protected applyFilterColumn(
    query: ModelQueryBuilder,
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

  getBaseQueryBuilder(instance: ModelQueryBuilder | null = null): ModelQueryBuilder {
    if (!instance) {
      instance = this.query
    }

    return instance
  }

  getQuery(): ModelQueryBuilder {
    return this.query
  }

  protected resolveRelationColumn(column: string): string {
    return column
  }

  protected compileColumnSearch(i: number, column: string, keyword: string): void {
    if (this.request.isRegex(i)) {
      this.regexColumnSearch(column, keyword)
    } else {
      this.compileQuerySearch(this.query, column, keyword, '')
    }
  }

  protected regexColumnSearch(column: string, keyword: string): void {
    column = this.wrap(column)

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
    query: ModelQueryBuilder,
    column: string,
    keyword: string,
    boolean: string = 'or'
  ): void {
    column = this.addTablePrefix(query, column)
    column = this.castColumn(column)
    let sql = column + ' LIKE ?'

    if (this.config.isCaseInsensitive()) {
      sql = 'LOWER(' + column + ') LIKE ?'
    }
    const method: string = `${boolean}WhereRaw`
    ;(query as any)[method](sql, [`%${keyword}%`])
  }

  addTablePrefix(query: ModelQueryBuilder, column: string): string {
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

    return this.wrap(column)
  }

  protected prepareKeyword(keyword: string): string {
    if (this.config.isCaseInsensitive()) {
      keyword = keyword.toLowerCase()
    }

    if (this.config.isStartsWithSearch()) {
      return `${keyword}%`
    }

    if (this.config.isWildcard()) {
      keyword = wildcardString(keyword, '%')
    }

    if (this.config.isSmartSearch()) {
      keyword = `%${keyword}%`
    }

    return keyword
  }

  filterColumn(column: string, callback: Function): this {
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

    if (typeof this.$limitCallback === 'function') {
      this.query.limit(limit)
      this.$limitCallback.apply(this.query, [this.query])
    } else {
      this.query.offset(start).limit(limit)
    }
  }

  limit(callback: Function): this {
    this.$limitCallback = callback

    return this
  }

  addColumn(name: string, content: any, order = false): this {
    this.pushToBlacklist(name)

    return super.addColumn(name, content, order)
  }

  resolveCallbackParameter() {
    return [this.query]
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
          const normalSql = self.wrap(column) + ' ' + orderable['direction']
          const sql = self.$nullsLast ? nullsLastSql : normalSql
          self.query.orderByRaw(sql)
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
        appends[key] = Obj.value(value(this.getFilteredQuery()))
      } else {
        appends[key] = value
      }
    }

    // Set flag to disable ordering
    appends['disableOrdering'] = this.$disableUserOrdering

    return { ...data, ...appends }
  }

  getFilteredQuery(): ModelQueryBuilder {
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

  protected applyFixedOrderingToQuery(_keyName: string, _orderedKeys: string[]): void {}
}
