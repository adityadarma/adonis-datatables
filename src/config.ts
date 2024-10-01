import app from '@adonisjs/core/services/app'
import { Config as DatatablesConfig } from './types/index.js'
import lodash from 'lodash'

export default class Config {
  protected config: DatatablesConfig

  constructor(config: DatatablesConfig) {
    this.config = config
  }

  isWildcard(): boolean {
    return lodash.get(this.config, 'search.use_wildcards', false)
  }

  isSmartSearch(): boolean {
    return lodash.get(this.config, 'search.smart', true)
  }

  isCaseInsensitive(): boolean {
    return lodash.get(this.config, 'search.case_insensitive', false)
  }

  isDebugging(): boolean {
    return lodash.get(this.config, 'debug', false)
  }

  get(key: string, defaultValue: any = null) {
    return lodash.get(this.config, key, defaultValue)
  }

  set(key: string, value: any = null) {
    app.config.set(key, value)
  }

  isMultiTerm(): boolean {
    return lodash.get(this.config, 'search.multi_term', true)
  }

  isStartsWithSearch(): boolean {
    return lodash.get(this.config, 'search.starts_with', false)
  }

  jsonHeaders(): Record<string, any> {
    return lodash.get(this.config, 'json.header', {})
  }
}
