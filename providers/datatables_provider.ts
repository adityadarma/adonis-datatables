import type { ApplicationService } from '@adonisjs/core/types'
import Datatables from '../src/datatables.js'
import Config from '../src/utils/config.js'

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
      const engines: Record<string, any> = this.app.config.get(`datatables.engines`)

      return new Datatables(engines)
    })
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
