import LucidDataTable from '../lucid_datatable.js'

/**
 * Infer the datatables drivers from the user config
 */
export type InferDatatablesProviders<T extends DatatablesConfig> = T

export interface DatatablesLists {}

export type DatatablesConfig = {
  debug: boolean
  search: Record<string, boolean>
  index_column: string
  engines: Record<string, any>
  columns: Record<string, string | any>
  json: {
    header: Record<string, any>
  }
}

export type Engines = {
  lucid: LucidDataTable
  // database: DatabaseDataTable
}
