import lodash from 'lodash'
import Config from './config.js'
import Helper from './utils/helper.js'

export default class DataProcessor {
  protected $output: Record<string, any>[] = []

  protected $appendColumns: Record<string, any> = {}

  protected $editColumns: Record<string, any> = {}

  protected $rawColumns: string[] = []

  protected $onlyColumns: string[] = []

  protected $excessColumns: string[] = []

  protected $escapeColumns: any = []

  protected $includeIndex: boolean = false

  protected $exceptions: string[] = ['DT_RowId', 'DT_RowClass', 'DT_RowData', 'DT_RowAttr']

  constructor(
    protected $results: Record<string, any>[],
    columnDef: Record<string, any>,
    protected templates: Record<string, any>,
    protected start: number = 0,
    protected config: Config
  ) {
    this.$appendColumns = columnDef['append'] ?? {}
    this.$editColumns = columnDef['edit'] ?? {}
    this.$rawColumns = columnDef['raw'] ?? []
    this.$onlyColumns = columnDef['only'] ?? []
    this.$excessColumns = columnDef['excess'] ?? []
    this.$escapeColumns = columnDef['escape'] ?? []
    this.$includeIndex = columnDef['index'] ?? false
  }

  process(isObject = true) {
    const indexColumn = this.config.get('index_column', 'DT_RowIndex')

    for (const row of Object.values(this.$results)) {
      const data: Record<string, any> = Helper.serializeToObject(row)

      let value: Record<string, any> = this.addColumns(data, row)
      value = this.editColumns(value, row)
      value = this.setupRowVariables(value, row)
      value = this.selectOnlyNeededColumns(value)
      value = this.removeExcessColumns(value)

      if (this.$includeIndex) {
        value[indexColumn] = ++this.start
      }

      this.$output.push(isObject ? value : this.convertToArray(value))
    }

    return this.escapeColumns(this.$output)
  }

  protected addColumns(data: Record<string, any>, row: Record<string, any>): Record<string, any> {
    for (const value of Object.values(this.$appendColumns)) {
      const content = value['content']
      const resultContent = Helper.compileContent(content, data, row)

      data = Helper.objectIncludeIn({ ...value, content: resultContent }, data)
    }

    return data
  }

  protected editColumns(data: Record<string, any>, row: Record<string, any>): Record<string, any> {
    for (const value of Object.values(this.$editColumns)) {
      const resultContent = Helper.compileContent(value['content'], data, row)

      lodash.set(data, value['name'], resultContent)
    }

    return data
  }

  protected setupRowVariables(
    data: Record<string, any>,
    row: Record<string, any>
  ): Record<string, any> {
    return new RowProcessor(data, row)
      .rowValue('DT_RowId', this.templates['DT_RowId'])
      .rowValue('DT_RowClass', this.templates['DT_RowClass'])
      .rowData('DT_RowData', this.templates['DT_RowData'])
      .rowData('DT_RowAttr', this.templates['DT_RowAttr'])
      .getData()
  }

  protected selectOnlyNeededColumns(data: Record<string, any>): Record<string, any> {
    if (!this.$onlyColumns.length) {
      return data
    } else {
      const results: Record<string, any> = {}

      for (const value of Object.values(this.$onlyColumns)) {
        lodash.set(results, value, lodash.get(data, value))
      }

      for (const value of Object.values(this.$exceptions)) {
        if (lodash.get(data, value)) {
          lodash.set(results, value, lodash.get(data, value))
        }
      }

      return results
    }
  }

  protected removeExcessColumns(data: Record<string, any>): Record<string, any> {
    for (const value of Object.values(this.$excessColumns)) {
      lodash.unset(data, value)
    }

    return data
  }

  protected convertToArray(array: Record<string, any>): Record<string, any> {
    const data: Record<string, any> = []
    for (const [key, value] of Object.entries(array)) {
      if (!data.includes(value)) {
        data[key] = value
      }
    }

    return data
  }

  protected escapeColumns(output: Record<string, any>[]): Record<string, any>[] {
    return output.map((row) => {
      if (this.$escapeColumns === '*') {
        row = this.escapeRow(row)
      } else if (Array.isArray(this.$escapeColumns)) {
        const columns = this.$escapeColumns.filter((col: any) => !this.$rawColumns.includes(col))
        for (const key of columns) {
          const content = lodash.get(row, key)
          lodash.set(row, key, Helper.escape(content))
        }
      }

      return row
    })
  }

  protected escapeRow(row: Record<string, any>): Record<string, any> {
    const rawColumns: string[] = this.$rawColumns
    const arrayDot = lodash.transform(
      row,
      (result: Record<string, any>, value: any, key: string) => {
        if (value) {
          result[key] = value
        }
      }
    )

    Object.keys(arrayDot).forEach((key) => {
      if (!rawColumns.includes(key)) {
        const value = lodash.get(arrayDot, key)
        if (lodash.isString(value) || lodash.isElement(value)) {
          arrayDot[key] = Helper.escape(value)
        }
      }
    })

    Object.keys(arrayDot).forEach((key) => {
      lodash.set(row, key, arrayDot[key])
    })

    return row
  }
}

class RowProcessor {
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
