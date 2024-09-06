import lodash from 'lodash'

export default class RowProcessor {
  constructor(
    protected data: Record<string, any>,
    protected row: any
  ) {}

  rowValue(attribute: string, template: any) {
    if (template !== undefined) {
      if (template !== Function && lodash.get(this.data, template)) {
        this.data[attribute] = lodash.get(this.data, template)
      } else {
        this.data[attribute] = template
      }
    }

    return this
  }

  rowData(attribute: string, template: any) {
    if (template.length) {
      this.data[attribute] = []
      for (const [index, value] of Object.entries(template)) {
        this.data[attribute][index] = value
      }
    }

    return this
  }

  getData() {
    return this.data
  }
}
