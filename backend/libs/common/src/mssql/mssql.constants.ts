export const MSSQL_POOL = Symbol('MSSQL_POOL');
export const MSSQL_OPTIONS = Symbol('MSSQL_OPTIONS');

/** Errores de negocio lanzados por los SP con THROW 50xxx. */
export const SQL_BUSINESS_ERRORS = {
  NOT_FOUND: 50002,
  CONCURRENCY_CONFLICT: 50003,
  DUPLICATE: 50004,
  HAS_MOVEMENTS: 50005,
  INVALID_DOCUMENT: 50006,
  INMUTABLE: 50010,
} as const;

/** Errores del motor considerados transitorios => se reintenta la operación. */
export const SQL_TRANSIENT_ERRORS: ReadonlySet<number> = new Set([
  1205, // deadlock victim
  1222, // lock request timeout
  40501, // service busy (Azure SQL)
  40613, // database unavailable (Azure SQL)
  49918,
  49919,
  49920,
]);

export const SQL_UNIQUE_VIOLATION: ReadonlySet<number> = new Set([2601, 2627]);
