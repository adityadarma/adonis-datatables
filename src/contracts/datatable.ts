export interface DataTable {
  results(): Promise<any[]>
  count(): Promise<number>
  totalCount(): Promise<number>
  filter(callback: CallableFunction, globalSearch: boolean): this
  filtering(): void
  columnSearch(): void
  paging(): void
  ordering(): void
  make(dataSupport: boolean): any
  toJson(dataSupport: boolean): any
}
