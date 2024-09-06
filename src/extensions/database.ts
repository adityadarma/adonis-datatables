// import { ModelQueryBuilder } from "@adonisjs/lucid/orm"
// import { QueryClientContract } from "@adonisjs/lucid/types/database"
// import { LucidModel } from "@adonisjs/lucid/types/model"
// import { DatabaseQueryBuilder } from "@adonisjs/lucid/database"

// declare module '@adonisjs/lucid/orm' {
//   interface ModelQueryBuilder {
//     newQuery(): this
//   }
// }

// ModelQueryBuilder.macro('newQuery', (this: ModelQueryBuilder, builder: , model: LucidModel, client: QueryClientContract) => {
//   return new ModelQueryBuilder()
// })

// declare module '@adonisjs/lucid/database' {
//   interface DatabaseQueryBuilder {
//     addNestedWhereQuery(query: DatabaseQueryBuilder, boolean?: string): this
//   }
// }

// DatabaseQueryBuilder.macro('addNestedWhereQuery', (this: DatabaseQueryBuilder, boolean: boolean = 'and') => {
//   return this
// })
