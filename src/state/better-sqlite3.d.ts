declare module 'better-sqlite3' {
  export class Database {
    constructor(filename: string, options?: { verbose?: any }): this
    prepare(sql: string): Statement
    exec(sql: string): void
    close(): void
  }

  export interface Statement {
    get(params?: any): any
    all(params?: any): any[]
    run(params?: any, ...args: any[]): this
    finalize(): this
  }
}