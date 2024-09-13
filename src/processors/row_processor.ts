import lodash from 'lodash'
import Helper from '../utils/helper.js'
import { isEmpty } from '../utils/function.js'

export default class RowProcessor {
  constructor(
    protected data: Record<string, any>,
    protected row: any
  ) {}

  async rowValue(attribute: string, template: any) {
    if (!isEmpty(template)) {
      if (typeof template !== 'function' && lodash.get(this.data, template)) {
        this.data[attribute] = lodash.get(this.data, template)
      } else {
        this.data[attribute] = await Helper.compileContent(template, this.data, this.row)
      }
    }

    return this
  }

  async rowData(attribute: string, template: any) {
    if (template.length) {
      this.data[attribute] = []
      for (const [index, value] of Object.entries(template)) {
        this.data[attribute][index] = await Helper.compileContent(value as any, this.data, this.row)
      }
    }

    return this
  }

  getData() {
    return this.data
  }
}
