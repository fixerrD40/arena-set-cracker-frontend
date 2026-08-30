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
  },
  {
    name: 'themes',
    sql: `ALTER TABLE decks ADD COLUMN themes text NOT NULL DEFAULT '[]'`
  },
  {
    name: 'status',
    sql: `ALTER TABLE decks ADD COLUMN status text NOT NULL DEFAULT 'concept'`
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

function dropDecksTagsColumn(rawDb: RawSqlJsDb): boolean {
  const names = tableColumnNames(rawDb, 'decks');
  if (!names?.includes('tags')) {
    return false;
  }

  rawDb.run('ALTER TABLE decks DROP COLUMN tags');
  return true;
}

/** Adds missing cards columns on databases created before those fields existed. Returns true if DDL ran. */
export function ensureCardsColumns(rawDb: RawSqlJsDb): boolean {
  return ensureTableColumns(rawDb, 'cards', ENSURED_CARD_COLUMNS);
}

export function ensureDecksColumns(rawDb: RawSqlJsDb): boolean {
  const added = ensureTableColumns(rawDb, 'decks', ENSURED_DECK_COLUMNS);
  const dropped = dropDecksTagsColumn(rawDb);
  return added || dropped;
}

/** Runs all table patches. Does not short-circuit so every table is inspected. */
export function ensureSqliteColumns(rawDb: RawSqlJsDb): boolean {
  const cards = ensureCardsColumns(rawDb);
  const decks = ensureDecksColumns(rawDb);
  return cards || decks;
}
