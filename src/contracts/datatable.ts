export interface DataTable {
  results(): Promise<any[]>

  count(): Promise<number>

  totalCount(): Promise<number>

  filtering(): void

  columnSearch(): void

  paging(): void

  ordering(): void

  toJson(): Promise<Record<string, any> | void>
}
