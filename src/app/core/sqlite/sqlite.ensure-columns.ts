/** sql.js Database-like: exec/run as used by both engines. */
export interface RawSqlJsDb {
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  run(sql: string): void;
}

const ENSURED_CARD_COLUMNS: readonly { name: string; sql: string }[] = [
  {
    name: 'collector_number',
    sql: `ALTER TABLE cards ADD COLUMN collector_number text NOT NULL DEFAULT ''`
  }
];

function tableColumnNames(rawDb: RawSqlJsDb, table: string): string[] | null {
  const result = rawDb.exec(`PRAGMA table_info(${table})`);
  if (!result.length) {
    return null;
  }

  const nameIdx = result[0].columns.indexOf('name');
  if (nameIdx < 0) {
    return null;
  }

  return result[0].values.map((row) => String(row[nameIdx]));
}

function ensureTableColumns(
  rawDb: RawSqlJsDb,
  table: string,
  columns: readonly { name: string; sql: string }[]
): boolean {
  const names = tableColumnNames(rawDb, table);
  if (!names) {
    return false;
  }

  const present = new Set(names);
  let altered = false;
  for (const column of columns) {
    if (present.has(column.name)) {
      continue;
    }
    rawDb.run(column.sql);
    altered = true;
  }
  return altered;
}

/** Adds missing cards columns on databases created before those fields existed. */
export function ensureSqliteColumns(rawDb: RawSqlJsDb): boolean {
  return ensureTableColumns(rawDb, 'cards', ENSURED_CARD_COLUMNS);
}
