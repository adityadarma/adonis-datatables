import type { ApplicationService } from '@adonisjs/core/types'
import Datatables from '../src/datatables.js'
import LucidDataTable from '../src/lucid_datatable.js'
// import CollectionDataTable from '../src/collection_datatable.js'
// import ObjectDataTable from '../src/object_datatable.js'
import { Config, Engines } from '../src/contracts/config.js'

export default class DatatablesProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {
    this.app.container.bind('datatables', () => {
      // const engines = this.app.config.get<object>(`datatables.engines`)
      const engines: Engines = {
        lucid: LucidDataTable,
        // collection: CollectionDataTable,
        // object: ObjectDataTable,
      }
      return new Datatables(engines)
    })

    this.app.container.bind('datatables_config', () => {
      // const config = this.app.config.get<object>(`datatables`)
      const config: Config = {
        debug: true,
        search: {
          smart: true,
          multi_term: true,
          case_insensitive: true,
          use_wildcards: false,
          starts_with: false,
        },
        index_column: 'DT_RowIndex',
        engines: {
          lucid: LucidDataTable,
          // collection: CollectionDataTable,
          // object: ObjectDataTable,
        },
        columns: {
          excess: ['rn', 'row_num'],
          escape: '*',
          raw: ['action'],
          blacklist: ['password', 'remember_token'],
          whitelist: '*',
        },
        json: {
          header: [],
          options: false,
        },
      }

      return config
    })

    await import('../src/extensions/request.js')
  }

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shut down the app
   */
  async shutdown() {}
}

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    datatables: Datatables
    datatables_config: Config
  }
}
