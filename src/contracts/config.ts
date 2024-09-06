export interface Config {
  debug: boolean
  search: Record<string, boolean>
  index_column: string
  engines: Engines
  columns: Record<string, string | any>
  json: {
    header: Record<string, any>
    options: boolean
  }
}

export interface Engines extends Record<string, any> {}
