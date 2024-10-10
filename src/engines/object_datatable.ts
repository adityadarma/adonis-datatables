import collect, { Collection } from 'collect.js'
import lodash from 'lodash'
import { DataTableAbstract } from '../datatable_abstract.js'
import Helper from '../utils/helper.js'

export default class ObjectDataTable extends DataTableAbstract {
  protected $offset: number = 0

  constructor(protected collection: Collection<any>) {
    super()
    if (!(collection instanceof Collection)) {
      this.collection = new Collection(collection)
    }
    this.$columns = this.collection.keys()
  }

  static canCreate(source: any): boolean {
    return typeof source === 'object' || source instanceof Collection
  }

  static create<T>(this: new (source: any) => T, source: any): T {
    if (!(source instanceof Collection)) {
      source = new Collection(source)
    }

    return super.create<T>(source)
  }

  protected resolveCallback() {
    return this
  }

  defaultOrdering(): any {
    const self = this
    const orderable = this.request.orderableColumns()

    if (orderable.length) {
      this.collection = this.collection
        .map((data) => Helper.dot(data))
        .sort((a, b) => {
          for (const value of Object.values(this.request.orderableColumns())) {
            const column = self.getColumnName(value['column']) as string
            const direction = value['direction']
            let first: Record<string, any>
            let second: Record<string, any>
            let cmp: number

            if (direction === 'desc') {
              first = b
              second = a
            } else {
              first = a
              second = b
            }
            if (
              Number.isInteger(first[column] ?? null) &&
              Number.isInteger(second[column] ?? null)
            ) {
              if (first[column] < second[column]) {
                cmp = -1
              } else if (first[column] > second[column]) {
                cmp = 1
              } else {
                cmp = 0
              }
            } else if (this.config.isCaseInsensitive()) {
              const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
              cmp = collator.compare(first[column], second[column])
            } else {
              const collator = new Intl.Collator(undefined, {
                sensitivity: 'variant',
                numeric: true,
              })
              cmp = collator.compare(first[column], second[column])
            }
            if (cmp !== 0) {
              return cmp
            }
          }
          return 0
        })
        .map((data) => {
          for (const [index, value] of Object.entries(data)) {
            lodash.unset(data, index)
            lodash.set(data, index, value)
          }

          return data
        })
    }
  }

  dataResults(): any {
    return this.collection.all()
  }

  protected revertIndexColumn(): void {
    if (this.$columnDef['index']) {
      const indexColumn = this.config.get('datatables.index_column', 'DT_RowIndex')
      const index = this.$dataObject ? indexColumn : 0
      let start = this.request.start()

      this.collection.transform((data) => {
        data[index] = ++start

        return data
      })
    }
  }

  setOffset(offset: number): this {
    this.$offset = offset

    return this
  }

  async count(): Promise<number> {
    return this.collection.count()
  }

  columnSearch(): void {
    const self = this
    for (let i = 0, c = this.request.columns().length; i < c; i++) {
      const column = this.getColumnName(i)

      if (column === null) {
        continue
      }

      if (!this.request.isColumnSearchable(i) || this.isBlacklisted(column)) {
        continue
      }

      const regex = this.request.isRegex(i)
      const keyword = this.request.columnKeyword(i)

      this.collection = this.collection.filter((row: Record<string, any>) => {
        const value = lodash.get(row, column)

        if (self.config.isCaseInsensitive()) {
          if (regex) {
            return new RegExp(keyword, 'i').test(value)
          }

          return Helper.contains(value.toLowerCase(), keyword.toLowerCase())
        }

        if (regex) {
          return new RegExp(keyword).test(value)
        }

        return Helper.contains(value, keyword)
      })
    }
  }

  paging(): void {
    const offset = this.request.start() - this.$offset
    const length = this.request.length() > 0 ? this.request.length() : 10

    this.collection = this.collection.slice(offset, length)
  }

  async results(): Promise<Record<string, any> | void> {
    try {
      this.prepareContext()

      this.totalRecords = await this.totalCount()

      if (this.totalRecords) {
        const results = await this.dataResults()
        const processed = await this.processResults(results)
        const output = lodash.transform(
          processed,
          (result: Record<string, any>, value: any, key: string) => {
            if (value) {
              result[key] = value
            }
          }
        )

        this.collection = collect(output)
        this.ordering()
        await this.filterRecords()
        this.paginate()

        this.revertIndexColumn()
      }

      return this.render(this.collection.all())
    } catch (error) {
      return this.errorResponse(error)
    }
  }

  globalSearch(keyword: string): void {
    keyword = this.config.isCaseInsensitive() ? keyword.toLowerCase() : keyword

    this.collection = this.collection.filter((row: any) => {
      for (const index of Object.values(this.request.searchableColumnIndex())) {
        const column = this.getColumnName(index) as string
        let value = lodash.get(row, column)
        if (typeof value !== 'string') {
          continue
        } else {
          value = this.config.isCaseInsensitive() ? value.toLowerCase() : value
        }

        if (Helper.contains(value, keyword)) {
          return true
        }
      }

      return false
    })
  }
}
