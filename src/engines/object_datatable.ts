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

  defaultOrdering(): any {
    const self = this
    collect(this.request.orderableColumns())
      .map((orderable: Record<string, any>) => {
        orderable['name'] = self.getColumnName(orderable['column'], true)

        return orderable
      })
      .each((orderable: Record<string, any>) => {
        const column = self.getColumnName(orderable['column']) as string
        const direction = orderable['direction']

        if (direction === 'desc') {
          this.collection = this.collection.sortByDesc(column)
        } else {
          this.collection = this.collection.sortBy(column)
        }
      })
  }

  results(): any {
    return this.collection.values().all()
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

  async toJson(): Promise<Record<string, any> | void> {
    try {
      this.prepareContext()

      this.totalRecords = await this.totalCount()
      this.ordering()
      this.filterRecords()
      this.paginate()

      if (this.totalRecords) {
        const results = await this.results()
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
      }

      return this.render(this.collection.values().all())
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

  protected resolveCallback() {
    return this
  }
}
