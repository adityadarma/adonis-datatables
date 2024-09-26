import DatatablesRequest from './request.js'
import { HttpContext } from '@adonisjs/core/http'
import collect from 'collect.js'
import { arrayIntersectKey, arrayReplaceRecursive } from './utils/function.js'
import { arrayMergeRecursive } from './utils/function.js'
import Config from './config.js'
import { Exception } from '@adonisjs/core/exceptions'
import DataProcessor from './processors/data_processor.js'
import Helper from './utils/helper.js'
import type { Logger } from '@adonisjs/logger'
import { DataTable, DatatablesConfig } from './types/index.js'
import app from '@adonisjs/core/services/app'
import lodash from 'lodash'

export abstract class DataTableAbstract implements DataTable {
  protected ctx!: HttpContext

  protected logger!: Logger

  protected config!: Config

  protected request!: DatatablesRequest

  protected $columns: Record<string, any> = {}

  protected $columnDef: Record<string, any> = {
    index: false,
    append: [],
    edit: [],
    filter: [],
    order: [],
    only: [],
    hidden: [],
    visible: [],
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
    DT_RowData: [],
    DT_RowAttr: [],
  }

  protected orderCallback: Function | null = null

  protected $skipPaging: boolean = false

  protected appends: Record<string, any> = {}

  protected $editOnlySelectedColumns: boolean = false

  static canCreate(_source: any) {
    return false
  }

  static create<T>(this: new (source: any) => T, source: any): T {
    return new this(source)
  }

  constructor() {
    this.config = new Config(app.config.get<DatatablesConfig>('datatables'))
  }

  /**
   *  Implement function
   */
  abstract defaultOrdering(): any

  /**
   *  Implement function
   */
  abstract results(): Promise<any[]>

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
  abstract toJson(): Promise<Record<string, any> | void>

  /**
   *  Implement function
   */
  abstract globalSearch(keyword: string): void

  /**
   *  Implement function
   */
  protected abstract resolveCallback(): any

  setContext(ctx: HttpContext): this {
    this.ctx = ctx
    this.request = new DatatablesRequest(this.ctx.request)
    this.logger = ctx.logger

    return this
  }

  protected prepareContext(): this {
    if (!this.ctx) {
      this.ctx = this.ctx ? this.ctx : HttpContext.getOrFail()
      this.request = new DatatablesRequest(this.ctx.request)
      this.logger = this.ctx.logger

      return this
    }

    throw new Exception('Context not found')
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

    return arrayReplaceRecursive(arrayIntersectKey(datatableColumns, allowed), this.$columnDef)
  }

  only(columns: string[] = []): this {
    this.$columnDef['only'] = columns

    return this
  }

  escapeColumns(columns: string = '*'): this {
    this.$columnDef['escape'] = columns

    return this
  }

  makeHidden(attributes: string[] = []): this {
    const hidden = lodash.get(this.$columnDef, 'hidden', [])
    this.$columnDef['hidden'] = arrayMergeRecursive(hidden, attributes)

    return this
  }

  makeVisible(attributes: string[] = []): this {
    const visible = lodash.get(this.$columnDef, 'visible', [])
    this.$columnDef['visible'] = arrayMergeRecursive(visible, attributes)

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

  setRowClass(content: any): this {
    this.$templates['DT_RowClass'] = content

    return this
  }

  setRowId(content: string): this {
    this.$templates['DT_RowId'] = content

    return this
  }

  setRowData(data: string): this {
    this.$templates['DT_RowData'] = data

    return this
  }

  addRowData(key: string, value: any): this {
    this.$templates['DT_RowData'][key] = value

    return this
  }

  setRowAttr(data: any[]): this {
    this.$templates['DT_RowAttr'] = data

    return this
  }

  addRowAttr(key: string, value: any): this {
    this.$templates['DT_RowAttr'][key] = value

    return this
  }

  with(key: any, value: any = ''): this {
    if (Array.isArray(key)) {
      this.appends = key
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

  ordering(): void {
    if (typeof this.orderCallback === 'function') {
      this.orderCallback(this.resolveCallback())
      return
    } else {
      this.defaultOrdering()
    }
  }

  async totalCount(): Promise<number> {
    const total = await this.count()
    return this.totalRecords ? this.totalRecords : total
  }

  editOnlySelectedColumns(): this {
    this.$editOnlySelectedColumns = true

    return this
  }

  protected filterRecords(): void {
    if (this.autoFilter && this.request.isSearchable()) {
      this.filtering()
    }

    if (typeof this.filterCallback === 'function') {
      this.filterCallback(this.resolveCallback())
    }

    this.columnSearch()
    this.filteredCount()
  }

  filtering(): void {
    const keyword = this.request.keyword()
    if (this.config.isMultiTerm()) {
      this.smartGlobalSearch(keyword)
      return
    }

    this.globalSearch(keyword)
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

  protected async processResults(results: Record<string, any>[]): Promise<Record<string, any>[]> {
    const processor = new DataProcessor(
      results,
      this.getColumnsDefinition(),
      this.$templates,
      this.request.start(),
      this.config
    )

    return await processor.process()
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
    return response.json(output)
  }

  protected attachAppends(data: Record<string, any>): Record<string, any> {
    return { ...data, ...this.appends }
  }

  protected showDebugger(output: Record<string, any>): Record<string, any> {
    output['input'] = this.request.all()

    return output
  }

  protected errorResponse(exception: Exception) {
    return this.ctx.response.json({
      draw: this.request.draw(),
      recordsTotal: this.totalRecords,
      recordsFiltered: 0,
      data: [],
      error: `Exception Message: ${exception.stack}`,
    })
  }

  filter(
    callback: <T extends abstract new (...args: any) => any>(query: InstanceType<T>) => void,
    globalSearch: boolean = false
  ): this {
    this.autoFilter = globalSearch
    this.filterCallback = callback

    return this
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
}
