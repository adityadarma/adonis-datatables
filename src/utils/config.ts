import app from '@adonisjs/core/services/app'
import Obj from './obj.js'
import { DatatablesConfig } from '../types/index.js'

export default class Config {
  protected config: DatatablesConfig

  constructor(config: DatatablesConfig) {
    this.config = config
  }

  isWildcard(): boolean {
    return Obj.get(this.config, 'search.use_wildcards', false)
  }

  isSmartSearch(): boolean {
    return Obj.get(this.config, 'search.smart', true)
  }

  isCaseInsensitive(): boolean {
    return Obj.get(this.config, 'search.case_insensitive', false)
  }

  isDebugging(): boolean {
    return Obj.get(this.config, 'debug', false)
  }

  get(key: string, defaultValue: any = null) {
    return Obj.get(this.config, key, defaultValue)
  }

  set(key: string, value: any = null) {
    app.config.set(key, value)
  }

  isMultiTerm(): boolean {
    return Obj.get(this.config, 'search.multi_term', true)
  }

  isStartsWithSearch(): boolean {
    return Obj.get(this.config, 'search.starts_with', false)
  }

  jsonOptions(): number {
    const options: number = Obj.get(this.config, 'json.options', 0)

    return options
  }

  jsonHeaders(): Record<string, any> {
    return Obj.get(this.config, 'json.header', {})
  }
}
