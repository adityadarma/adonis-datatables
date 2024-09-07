import app from '@adonisjs/core/services/app'
import Config from '../src/utils/config.js'

let config: Config

/**
 * Returns a singleton instance of the datatables from the
 * container
 */
await app.booted(async () => {
  config = await app.container.make('datatables_config')
})

export { config as default }
