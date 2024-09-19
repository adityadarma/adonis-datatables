import { Request } from '@adonisjs/http-server'

export default class DatatablesRequest {
  constructor(protected request: Request) {}

  input(key: string, defaultValue?: any): any {
    const keys = key.split('.')

    const columns: { [key: string]: any } = this.request.input(keys[0])
    if (!columns) {
      return defaultValue
    }

    keys.shift()
    const value = keys.reduce((acc, curr) => acc && acc[curr], columns)

    return value
  }

  columns(): string[] {
    return this.request.input('columns')
  }

  isSearchable(): boolean {
    return this.request.input('search.value') !== ''
  }

  isRegex(index: number): boolean {
    return this.input(`columns.${index}.search.regex`) === 'true'
  }

  orderableColumns(): Record<string, any>[] {
    if (!this.isOrderable()) {
      return []
    }

    let orderable: Record<string, any>[] = []
    for (let i = 0; i < this.request.input('order').length; i++) {
      const orderColumn: number = this.input(`order.${i}.column`) as unknown as number

      const direction: string = this.input(`order.${i}.dir`)

      const orderDirection: string = direction && direction.toLowerCase() === 'asc' ? 'asc' : 'desc'
      if (this.isColumnOrderable(orderColumn)) {
        orderable.push({ column: orderColumn, direction: orderDirection })
      }
    }

    return orderable
  }

  isOrderable(): boolean {
    return this.request.input('order') && this.request.input('order').length > 0
  }

  isColumnOrderable(index: number): boolean {
    return this.input(`columns.${index}.orderable`, 'true') === 'true'
  }

  searchableColumnIndex(): number[] {
    const searchable: number[] = []
    const columns: object[] = this.request.input('columns')
    for (let index = 0; index < columns.length; index++) {
      if (this.isColumnSearchable(index, false)) {
        searchable.push(index)
      }
    }
    return searchable
  }

  isColumnSearchable(index: number, columnSearch = true): boolean {
    if (columnSearch) {
      return (
        (this.input(`columns.${index}.searchable`, 'true') === 'true' ||
          (this.input(`columns.${index}.searchable`, 'true') as unknown as boolean) === true) &&
        this.columnKeyword(index) !== ''
      )
    }

    return (
      this.input(`columns.${index}.searchable`, 'true') === 'true' ||
      (this.input(`columns.${index}.searchable`, 'true') as unknown as boolean) === true
    )
  }

  columnKeyword(index: number): string {
    const keyword: string = this.input(`columns.${index}.search.value`) ?? ''

    return this.prepareKeyword(keyword)
  }

  prepareKeyword(keyword: number | string | string[]): string {
    if (Array.isArray(keyword)) {
      keyword = keyword as string[]
      return keyword.join(' ')
    }

    return keyword as string
  }

  keyword(): string {
    const keyword: string = this.input('search.value') ?? ''

    return this.prepareKeyword(keyword)
  }

  columnName(index: number): string | undefined {
    const column: { [key: string]: string } | undefined = this.request.input(`columns.${index}`)

    return column && column['name'] && column['name'] !== '' ? column['name'] : column?.['data']
  }

  isPaginationable(): boolean {
    return (
      this.request.input('start') !== null &&
      this.request.input('length') !== null &&
      this.request.input('length') !== -1
    )
  }

  getBaseRequest(): Request {
    return this.request
  }

  start(): number {
    const start: any = this.request.input('start', 0)

    return Number(start) ? (start as number) : 0
  }

  length(): number {
    const length: any = this.request.input('length', 0)

    return Number(length) ? (length as number) : 10
  }

  draw(): number {
    const draw: any = this.request.input('draw', 0)

    return Number(draw) ? (draw as number) : 0
  }

  all() {
    return this.request.all()
  }
}
