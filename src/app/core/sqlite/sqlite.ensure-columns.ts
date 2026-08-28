/** sql.js Database-like: exec/run as used by both engines. */
export interface RawSqlJsDb {
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  run(sql: string): void;
}

const ENSURED_CARD_COLUMNS: readonly { name: string; sql: string }[] = [
  {
    name: 'oracle_text',
    sql: `ALTER TABLE cards ADD COLUMN oracle_text text NOT NULL DEFAULT ''`
  },
  {
    name: 'local_illustration_uri',
    sql: `ALTER TABLE cards ADD COLUMN local_illustration_uri text NOT NULL DEFAULT ''`
  }
];

const ENSURED_DECK_COLUMNS: readonly { name: string; sql: string }[] = [
  {
    name: 'cover_card_id',
    sql: `ALTER TABLE decks ADD COLUMN cover_card_id text NOT NULL DEFAULT ''`
  }
];

function ensureTableColumns(
  rawDb: RawSqlJsDb,
  table: string,
  columns: readonly { name: string; sql: string }[]
): boolean {
  const result = rawDb.exec(`PRAGMA table_info(${table})`);
  if (!result.length) {
    return false;
  }

  const nameIdx = result[0].columns.indexOf('name');
  if (nameIdx < 0) {
    return false;
  }

  const present = new Set(result[0].values.map((row) => String(row[nameIdx])));
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

/** Adds missing cards columns on databases created before those fields existed. Returns true if DDL ran. */
export function ensureCardsColumns(rawDb: RawSqlJsDb): boolean {
  return ensureTableColumns(rawDb, 'cards', ENSURED_CARD_COLUMNS);
}

export function ensureDecksColumns(rawDb: RawSqlJsDb): boolean {
  return ensureTableColumns(rawDb, 'decks', ENSURED_DECK_COLUMNS);
}

/** Runs all table patches. Does not short-circuit so every table is inspected. */
export function ensureSqliteColumns(rawDb: RawSqlJsDb): boolean {
  const cards = ensureCardsColumns(rawDb);
  const decks = ensureDecksColumns(rawDb);
  return cards || decks;
}
