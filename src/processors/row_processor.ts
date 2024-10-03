import lodash from 'lodash'
import Helper from '../utils/helper.js'

export default class RowProcessor {
  constructor(
    protected data: Record<string, any>,
    protected row: any
  ) {}

  rowValue(attribute: string, template: string) {
    if (template) {
      if (typeof template !== 'function' && lodash.get(this.data, template)) {
        this.data[attribute] = lodash.get(this.data, template)
      } else {
        this.data[attribute] = Helper.compileContent(template, this.data, this.row)
      }
    }

    return this
  }

  rowData(attribute: string, template: Record<string, any>) {
    if (Object.keys(template).length) {
      let data: Record<string, any> = {}
      for (const [index, value] of Object.entries(template)) {
        data[index] = Helper.compileContent(value as any, this.data, this.row)
      }

      this.data[attribute] = data
    }

    return this
  }

  getData() {
    return this.data
  }
}
