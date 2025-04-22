import Request from './request.js'
import { HttpContext } from '@adonisjs/core/http'
import collect from 'collect.js'
import Config from './config.js'
import { Exception } from '@adonisjs/core/exceptions'
import DataProcessor from './processor.js'
import Helper from './utils/helper.js'
import { DataTable } from './types/index.js'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'

export abstract class DataTableAbstract implements DataTable {
  protected ctx!: HttpContext

  protected config!: Config

  protected request!: Request

  protected $columns: Record<string, any> = {}

  protected $columnDef: Record<string, any> = {
    index: false,
    append: [],
    edit: [],
    filter: {},
    order: {},
    only: [],
  }

  protected $extraColumns: string[] = []

  protected totalRecords: number = 0

  protected filteredRecords: number = 0

  protected $skipTotalRecords: boolean = false

  protected autoFilter: boolean = true

  protected filterCallback: Function | null = null

  protected $templates: Record<string, any> = {
    DT_RowId: '',
    DT_RowClass: '',
    DT_RowData: {},
    DT_RowAttr: {},
  }

  protected orderCallback: Function | null = null

  protected $skipPaging: boolean = false

  protected appends: Record<string, any> = {}

  protected $editOnlySelectedColumns: boolean = false

  protected $dataObject: boolean = true

  protected $queryLogging: Record<string, any>[] = []

  constructor() {
    this.config = new Config(app.config.get('datatables'))

    emitter.on('db:query', (query) => {
      this.$queryLogging.push({
        query: query.sql,
        bindings: query.bindings,
        time: `${query.duration}ms`,
      })
    })
  }

  static canCreate(_source: any) {
    return false
  }

  static create<T>(this: new (source: any) => T, source: any): T {
    return new this(source)
  }

  /**
   *  Implement function
   */
  protected abstract defaultOrdering(): any

  /**
   *  Implement function
   */
  protected abstract resolveCallback(): any

  /**
   *  Implement function
   */
  abstract dataResults(): Promise<any[]>

  /**
   *  Implement function
   */
  abstract count(): Promise<number>

  /**
   *  Implement function
   */
  abstract columnSearch(): void

  /**
   *  Implement function
   */
  abstract paging(): void

  /**
   *  Implement function
   */
  abstract results(): Promise<Record<string, any> | void>

  /**
   *  Implement function
   */
  abstract globalSearch(keyword: string): void

  protected prepareContext(): void {
    if (this.ctx) {
      return
    }

    this.ctx = this.ctx ? this.ctx : HttpContext.getOrFail()
    this.request = new Request(this.ctx.request)
  }

  async totalCount(): Promise<number> {
    const total = await this.count()
    return this.totalRecords ? this.totalRecords : total
  }

  protected isBlacklisted(column: string): boolean {
    const columnDef = this.getColumnsDefinition()

    if (columnDef['blacklist'].includes(column)) {
      return true
    }

    if (
      columnDef['whitelist'] === '*' ||
      (columnDef['whitelist'] && columnDef['whitelist'].includes(column))
    ) {
      return false
    }

    return true
  }

  protected async filterRecords(): Promise<void> {
    if (this.autoFilter && this.request.isSearchable()) {
      this.filtering()
    }

    if (typeof this.filterCallback === 'function') {
      this.filterCallback(this.resolveCallback())
    }

    this.columnSearch()
    await this.filteredCount()
  }

  protected smartGlobalSearch(keyword: string): void {
    const self = this
    collect(keyword.split(' '))
      .reject((text) => text.trim() === '')
      .each((text) => self.globalSearch(text))
  }

  protected async filteredCount(): Promise<number> {
    const total: number = await this.count()

    return (this.filteredRecords = this.filteredRecords ? this.filteredRecords : total)
  }

  protected paginate(): void {
    if (this.request.isPaginationable() && !this.$skipPaging) {
      this.paging()
    }
  }

  protected processResults(results: Record<string, any>[]): Record<string, any>[] {
    const processor = new DataProcessor(
      results,
      this.getColumnsDefinition(),
      this.$templates,
      this.request.start(),
      this.config
    )

    return processor.process(this.$dataObject)
  }

  protected render(data: any[]): void {
    let output = this.attachAppends({
      draw: this.request.draw(),
      recordsTotal: this.totalRecords,
      recordsFiltered: this.filteredRecords ?? 0,
      data: data,
    })

    if (this.config.isDebugging()) {
      output = this.showDebugger(output)
    }

    const response = this.ctx.response.status(200)
    for (const [key, value] of this.config.jsonHeaders().entries()) {
      response.append(key, value)
    }

    emitter.clearListeners('db:query')
    return response.json(output)
  }

  protected attachAppends(data: Record<string, any>): Record<string, any> {
    return { ...data, ...this.appends }
  }

  protected showDebugger(output: Record<string, any>): Record<string, any> {
    output['queries'] = this.$queryLogging
    output['input'] = this.request.all()

    return output
  }

  protected errorResponse(exception: Exception) {
    emitter.clearListeners('db:query')

    if (!this.ctx) {
      return
    }

    return this.ctx.response.status(500).json({
      draw: this.request.draw(),
      recordsTotal: this.totalRecords,
      recordsFiltered: 0,
      data: [],
      error: `Exception Message: ${exception.stack}`,
    })
  }

  protected setupKeyword(value: string): string {
    if (this.config.isSmartSearch()) {
      let keyword = `%${value}%}`
      if (this.config.isWildcard()) {
        keyword = Helper.wildcardString(value, '%')
      }

      return keyword.replace('\\', '%')
    }

    return value
  }

  protected getColumnName(index: number, wantsAlias: boolean = false): string | null {
    let column = this.request.columnName(index)

    if (column === null || column === undefined) {
      return null
    }

    if (Number.isInteger(column)) {
      column = this.getColumnNameByIndex(index)
    }

    if (Helper.contains(column.toUpperCase(), ' AS ')) {
      column = Helper.extractColumnName(column, wantsAlias)
    }

    return column
  }

  protected getColumnNameByIndex(index: number): string {
    const name =
      this.$columns[index] !== undefined && this.$columns[index] !== '*'
        ? this.$columns[index]
        : this.getPrimaryKeyName()

    return this.$extraColumns.includes(name) ? this.getPrimaryKeyName() : name
  }

  protected getPrimaryKeyName(): string {
    return 'id'
  }

  setContext(ctx: HttpContext): this {
    this.ctx = ctx
    this.request = new Request(this.ctx.request)

    return this
  }

  addColumn(
    name: string,
    content:
      | (<T extends abstract new (...args: any) => any>(row: InstanceType<T>) => string | number)
      | string
      | number,
    order: boolean = false
  ): this {
    this.$extraColumns.push(name)

    this.$columnDef['append'].push({
      name: name,
      content: content,
      order: order,
    })

    return this
  }

  addIndexColumn(): this {
    this.$columnDef['index'] = true

    return this
  }

  editColumn(name: string, content: any): this {
    if (this.$editOnlySelectedColumns) {
      if (
        !this.request.columns().length ||
        this.request
          .columns()
          .map((column: any) => column.name)
          .includes(name)
      ) {
        this.$columnDef['edit'].push({
          name: name,
          content: content,
        })
      }
    } else {
      this.$columnDef['edit'].push({
        name: name,
        content: content,
      })
    }

    return this
  }

  removeColumn(...names: string[]): this {
    this.$columnDef.excess = [...this.getColumnsDefinition()['access'], ...names]

    return this
  }

  getColumnsDefinition(): Record<string, any> {
    const datatableColumns = this.config.get('columns') as any[]
    const allowed = ['excess', 'escape', 'raw', 'blacklist', 'whitelist']

    return Helper.objectReplaceRecursive(
      Helper.objectIntersectKey(datatableColumns, allowed),
      this.$columnDef
    )
  }

  only(columns: string[] = []): this {
    this.$columnDef['only'] = columns

    return this
  }

  escapeColumns(columns: string = '*'): this {
    this.$columnDef['escape'] = columns

    return this
  }

  rawColumns(columns: string[], merge: boolean = false): this {
    if (merge) {
      const datatableColumns = this.config.get('columns') as any

      this.$columnDef['raw'] = [...datatableColumns.raw, ...columns]
    } else {
      this.$columnDef['raw'] = columns
    }

    return this
  }

  setRowClass(
    content:
      | (<T extends abstract new (...args: any) => any>(query: InstanceType<T>) => string | number)
      | string
  ): this {
    this.$templates['DT_RowClass'] = content

    return this
  }

  setRowId(
    content:
      | (<T extends abstract new (...args: any) => any>(query: InstanceType<T>) => string | number)
      | string
  ): this {
    this.$templates['DT_RowId'] = content

    return this
  }

  setRowData(
    data: Record<
      string,
      (<T extends abstract new (...args: any) => any>(query: InstanceType<T>) => string) | string
    >
  ): this {
    this.$templates['DT_RowData'] = data

    return this
  }

  addRowData(
    key: string,
    value:
      | (<T extends abstract new (...args: any) => any>(query: InstanceType<T>) => string)
      | string
  ): this {
    this.$templates['DT_RowData'][key] = value

    return this
  }

  setRowAttr(
    data: Record<
      string,
      | (<T extends abstract new (...args: any) => any>(query: InstanceType<T>) => string | number)
      | string
      | number
    >
  ): this {
    this.$templates['DT_RowAttr'] = data

    return this
  }

  addRowAttr(
    key: string,
    value:
      | (<T extends abstract new (...args: any) => any>(query: InstanceType<T>) => string | number)
      | string
  ): this {
    this.$templates['DT_RowAttr'][key] = value

    return this
  }

  with(key: any, value: any = ''): this {
    if (Array.isArray(key)) {
      this.appends = { ...this.appends, ...key }
    } else {
      this.appends[key] = Helper.value(value)
    }

    return this
  }

  withQuery(
    key: string,
    callback: <T extends abstract new (...args: any) => any>(query: InstanceType<T>) => string
  ): this {
    this.appends[key] = callback

    return this
  }

  order(
    callback: <T extends abstract new (...args: any) => any>(query: InstanceType<T>) => void
  ): this {
    this.orderCallback = callback

    return this
  }

  blacklist(blacklist: any[]): this {
    this.$columnDef['blacklist'] = blacklist

    return this
  }

  whitelist(whitelist: string | string[] = '*'): this {
    this.$columnDef['whitelist'] = whitelist

    return this
  }

  smart(state: boolean = true): this {
    this.config.set('datatables.search.smart', state)

    return this
  }

  startsWithSearch(state: boolean = true): this {
    this.config.set('datatables.search.starts_with', state)

    return this
  }

  setTotalRecords(total: number): this {
    this.totalRecords = total

    return this
  }

  skipTotalRecords(): this {
    this.totalRecords = 0
    this.$skipTotalRecords = true

    return this
  }

  setFilteredRecords(total: number): this {
    this.filteredRecords = total

    return this
  }

  skipPaging(): this {
    this.$skipPaging = true

    return this
  }

  pushToBlacklist(column: string): this {
    if (!this.isBlacklisted(column)) {
      if (this.$columnDef['blacklist'] === undefined) {
        this.$columnDef['blacklist'] = []
      }

      this.$columnDef['blacklist'].push(column)
    }

    return this
  }

  filtering(): void {
    const keyword = this.request.keyword()
    if (this.config.isMultiTerm()) {
      this.smartGlobalSearch(keyword)
      return
    }

    this.globalSearch(keyword)
  }

  editOnlySelectedColumns(): this {
    this.$editOnlySelectedColumns = true

    return this
  }

  ordering(): void {
    if (typeof this.orderCallback === 'function') {
      this.orderCallback(this.resolveCallback())
      return
    } else {
      this.defaultOrdering()
    }
  }

  filter(
    callback: <T extends abstract new (...args: any) => any>(query: InstanceType<T>) => void,
    globalSearch: boolean = false
  ): this {
    this.filterCallback = callback
    this.autoFilter = globalSearch

    return this
  }

  asJson(): this {
    this.$dataObject = true

    return this
  }

  asArray(): this {
    this.$dataObject = false

    return this
  }
}
