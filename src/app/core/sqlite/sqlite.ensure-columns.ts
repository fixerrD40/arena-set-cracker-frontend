/** sql.js Database-like: exec/run as used by both engines. */
export interface RawSqlJsDb {
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  run(sql: string): void;
}

/** Adds cards.oracle_text on databases created before that column existed. Returns true if DDL ran. */
export function ensureCardsOracleTextColumn(rawDb: RawSqlJsDb): boolean {
  const result = rawDb.exec('PRAGMA table_info(cards)');
  if (!result.length) {
    return false;
  }

  const nameIdx = result[0].columns.indexOf('name');
  if (nameIdx < 0) {
    return false;
  }

  const hasOracleText = result[0].values.some((row) => row[nameIdx] === 'oracle_text');
  if (hasOracleText) {
    return false;
  }

  rawDb.run(`ALTER TABLE cards ADD COLUMN oracle_text text NOT NULL DEFAULT ''`);
  return true;
}
