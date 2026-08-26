import type { Sql, TransactionSql } from 'postgres';

export type SqlExecutor = Sql<{}> | TransactionSql<{}>;
