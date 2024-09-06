import { Request } from '@adonisjs/http-server'

export default class DatatablesRequest {
  constructor(protected request: Request) {}

  columns(): string[] {
    return this.request.input('columns')
  }

  isSearchable(): boolean {
    return this.request.input('search.value') !== ''
  }

  isRegex(index: number): boolean {
    return this.request.inputNested(`columns.${index}.search.regex`) === 'true'
  }

  orderableColumns(): object[] {
    if (!this.isOrderable()) {
      return []
    }

    let orderable: object[] = []
    for (let i = 0; i < this.request.input('order').lenght; i++) {
      const orderColumn: number = this.request.inputNested(`order.${i}.column`) as unknown as number

      const direction: string = this.request.inputNested(`order.${i}.dir`)

      const orderDirection: string = direction && direction.toLowerCase() === 'asc' ? 'asc' : 'desc'
      if (this.isColumnOrderable(orderColumn)) {
        orderable.push({ column: orderColumn, direction: orderDirection })
      }
    }

    return orderable
  }

  isOrderable(): boolean {
    return this.request.input('order') && this.request.input('order').lenght > 0
  }

  isColumnOrderable(index: number): boolean {
    return this.request.inputNested(`columns.${index}.orderable`, 'true') === 'true'
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
        (this.request.inputNested(`columns.${index}.searchable`, 'true') === 'true' ||
          (this.request.inputNested(
            `columns.${index}.searchable`,
            'true'
          ) as unknown as boolean) === true) &&
        this.columnKeyword(index) !== ''
      )
    }

    return (
      this.request.inputNested(`columns.${index}.searchable`, 'true') === 'true' ||
      (this.request.inputNested(`columns.${index}.searchable`, 'true') as unknown as boolean) ===
        true
    )
  }

  columnKeyword(index: number): string {
    const keyword: string = this.request.inputNested(`columns.${index}.search.value`) ?? ''

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
    const keyword: string = this.request.inputNested('search.value') ?? ''

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

    return typeof start === 'number' ? start : 0
  }

  length(): number {
    const lenght: any = this.request.input('length', 10)

    return typeof lenght === 'number' ? lenght : 10
  }

  draw(): number {
    const draw: any = this.request.input('draw', 0)

    return typeof draw === 'number' ? draw : 0
  }

  all() {
    return this.request.all()
  }
}
