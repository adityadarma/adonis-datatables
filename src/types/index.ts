export interface DataTable {
  results(): Promise<Record<string, any> | void>

  dataResults(): Promise<any[]>

  count(): Promise<number>

  totalCount(): Promise<number>

  filtering(): void

  columnSearch(): void

  paging(): void

  ordering(): void

  asJson(): this

  asArray(): this
}

export type Config = {
  debug: boolean
  search: Record<string, boolean>
  index_column: string
  engines: Record<string, any>
  columns: Record<string, string | any>
  json: {
    header: Record<string, any>
  }
}
