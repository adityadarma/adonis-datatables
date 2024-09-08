import app from '@adonisjs/core/services/app'
import { DatatablesConfig } from '../types/index.js'
import Helper from './helper.js'

export default class Config {
  protected config: DatatablesConfig

  constructor(config: DatatablesConfig) {
    this.config = config
  }

  isWildcard(): boolean {
    return Helper.get(this.config, 'search.use_wildcards', false)
  }

  isSmartSearch(): boolean {
    return Helper.get(this.config, 'search.smart', true)
  }

  isCaseInsensitive(): boolean {
    return Helper.get(this.config, 'search.case_insensitive', false)
  }

  isDebugging(): boolean {
    return Helper.get(this.config, 'debug', false)
  }

  get(key: string, defaultValue: any = null) {
    return Helper.get(this.config, key, defaultValue)
  }

  set(key: string, value: any = null) {
    app.config.set(key, value)
  }

  isMultiTerm(): boolean {
    return Helper.get(this.config, 'search.multi_term', true)
  }

  isStartsWithSearch(): boolean {
    return Helper.get(this.config, 'search.starts_with', false)
  }

  jsonOptions(): number {
    const options: number = Helper.get(this.config, 'json.options', 0)

    return options
  }

  jsonHeaders(): Record<string, any> {
    return Helper.get(this.config, 'json.header', {})
  }
}
