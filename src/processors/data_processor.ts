import lodash from 'lodash'
import { objectIncludeIn } from '../utils/function.js'
import Config from '../utils/config.js'
import RowProcessor from './row_processor.js'
import Helper from '../utils/helper.js'

export default class DataProcessor {
  protected $output: Record<string, any>[] = []

  protected $appendColumns: Record<string, any>[] = []

  protected $editColumns: Record<string, any>[] = []

  protected $rawColumns: string[] = []

  protected $exceptions: string[] = ['DT_RowId', 'DT_RowClass', 'DT_RowData', 'DT_RowAttr']

  protected $onlyColumns: string[] = []

  protected $makeHidden: string[] = []

  protected $makeVisible: string[] = []

  protected $excessColumns: string[] = []

  protected $escapeColumns: any = []

  protected $includeIndex: boolean = false

  constructor(
    protected $results: Record<string, any>[],
    columnDef: Record<string, any>,
    protected templates: Record<string, any>,
    protected start: number = 0,
    protected config: Config
  ) {
    this.$appendColumns = columnDef['append'] ?? []
    this.$editColumns = columnDef['edit'] ?? []
    this.$excessColumns = columnDef['excess'] ?? []
    this.$onlyColumns = columnDef['only'] ?? []
    this.$escapeColumns = columnDef['escape'] ?? []
    this.$includeIndex = columnDef['index'] ?? false
    this.$rawColumns = columnDef['raw'] ?? []
    this.$makeHidden = columnDef['hidden'] ?? []
    this.$makeVisible = columnDef['visible'] ?? []
  }

  async process() {
    this.$output = []
    const indexColumn = this.config.get('index_column', 'DT_RowIndex')

    for (const row of Object.values(this.$results)) {
      const data = Helper.serializeToObject(row)

      let value = await this.addColumns(data, row)
      value = await this.editColumns(value, row)
      value = await this.setupRowVariables(value, row)
      value = this.selectOnlyNeededColumns(value)
      value = this.removeExcessColumns(value)

      if (this.$includeIndex) {
        value[indexColumn] = ++this.start
      }

      this.$output.push(value)
    }

    return this.escapeColumns(this.$output)
  }

  protected async addColumns(
    data: Record<string, any>,
    row: Record<string, any>
  ): Promise<Record<string, any>> {
    for (const value of Object.values(this.$appendColumns)) {
      const content = value['content']
      let resultContent = content
      resultContent = await Helper.compileContent(content, data, row)
      data = objectIncludeIn({ ...value, content: resultContent }, data)
    }

    return data
  }

  protected async editColumns(data: Record<string, any>, row: any): Promise<Record<string, any>> {
    for (const value of Object.values(this.$editColumns)) {
      const content = value['content']
      let resultContent = content
      resultContent = await Helper.compileContent(content, data, row)
      lodash.set(data, value['name'], resultContent)
    }

    return data
  }

  protected async setupRowVariables(
    data: Record<string, any>,
    row: Record<string, any>
  ): Promise<Record<string, any>> {
    let processor = new RowProcessor(data, row)

    processor = await processor.rowValue('DT_RowId', this.templates['DT_RowId'])
    processor = await processor.rowValue('DT_RowClass', this.templates['DT_RowClass'])
    processor = await processor.rowData('DT_RowData', this.templates['DT_RowData'])
    processor = await processor.rowData('DT_RowAttr', this.templates['DT_RowAttr'])
    data = processor.getData()

    return data
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
    for (const value of Object.values(data)) {
      lodash.unset(data, value)
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
    const rawColumns: string[] = []
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
        if (lodash.isString(value)) {
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
