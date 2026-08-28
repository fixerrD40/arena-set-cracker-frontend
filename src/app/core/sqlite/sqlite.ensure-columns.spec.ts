import { ensureCardsColumns, ensureDecksColumns, ensureSqliteColumns, RawSqlJsDb } from './sqlite.ensure-columns';

function fakeDb(tables: Record<string, string[]>): RawSqlJsDb & { altered: string[] } {
  const altered: string[] = [];
  return {
    altered,
    exec: (sql: string) => {
      const table = /PRAGMA table_info\((\w+)\)/.exec(sql)?.[1] ?? '';
      const columnNames = tables[table] || [];
      return [
        {
          columns: ['cid', 'name', 'type'],
          values: columnNames.map((name, cid) => [cid, name, 'text'])
        }
      ];
    },
    run: (sql: string) => {
      altered.push(sql);
    }
  };
}

describe('ensureCardsColumns', () => {
  it('adds every missing cards column', () => {
    const db = fakeDb({ cards: ['id', 'name', 'mana_cost'] });
    expect(ensureCardsColumns(db)).toBe(true);
    expect(db.altered.join(' ')).toContain('oracle_text');
    expect(db.altered.join(' ')).toContain('local_illustration_uri');
  });

  it('adds only illustration when oracle_text already exists', () => {
    const db = fakeDb({ cards: ['id', 'name', 'oracle_text'] });
    expect(ensureCardsColumns(db)).toBe(true);
    expect(db.altered.length).toBe(1);
    expect(db.altered[0]).toContain('local_illustration_uri');
  });

  it('is a no-op when all ensured columns exist', () => {
    const db = fakeDb({ cards: ['id', 'oracle_text', 'local_illustration_uri'] });
    expect(ensureCardsColumns(db)).toBe(false);
    expect(db.altered.length).toBe(0);
  });

  it('is a no-op when cards has no pragma rows', () => {
    const db: RawSqlJsDb & { altered: string[] } = {
      altered: [],
      exec: () => [],
      run: (sql: string) => {
        db.altered.push(sql);
      }
    };
    expect(ensureCardsColumns(db)).toBe(false);
    expect(db.altered.length).toBe(0);
  });
});

describe('ensureSqliteColumns', () => {
  it('patches both cards and decks when each is missing a column', () => {
    const db = fakeDb({
      cards: ['id', 'oracle_text', 'local_illustration_uri'],
      decks: ['id', 'name']
    });
    expect(ensureSqliteColumns(db)).toBe(true);
    expect(db.altered.join(' ')).toContain('cover_card_id');
  });

  it('still patches decks when cards are already current', () => {
    const db = fakeDb({
      cards: ['id', 'oracle_text', 'local_illustration_uri'],
      decks: ['id', 'name']
    });
    expect(ensureCardsColumns(db)).toBe(false);
    expect(ensureDecksColumns(db)).toBe(true);
  });
});
