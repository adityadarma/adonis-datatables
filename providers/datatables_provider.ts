import type { ApplicationService } from '@adonisjs/core/types'
import { Datatables } from '../src/datatables.js'
import { DbQueryEventNode } from '@adonisjs/lucid/types/database'

declare module '@adonisjs/core/types' {
  export interface EventsList {
    'db:query': DbQueryEventNode
  }
}

export default class DatatablesProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton('datatables', () => {
      const engines: Record<string, any> = this.app.config.get(`datatables.engines`)

      return new Datatables(engines)
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {}

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
  }
}
