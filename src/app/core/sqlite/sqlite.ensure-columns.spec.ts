import { ensureCardsOracleTextColumn, RawSqlJsDb } from './sqlite.ensure-columns';

function fakeDb(columnNames: string[]): RawSqlJsDb & { altered: string[] } {
  const altered: string[] = [];
  return {
    altered,
    exec: () => [
      {
        columns: ['cid', 'name', 'type'],
        values: columnNames.map((name, cid) => [cid, name, 'text'])
      }
    ],
    run: (sql: string) => {
      altered.push(sql);
    }
  };
}

describe('ensureCardsOracleTextColumn', () => {
  it('alters cards when oracle_text is missing', () => {
    const db = fakeDb(['id', 'name', 'mana_cost']);
    expect(ensureCardsOracleTextColumn(db)).toBe(true);
    expect(db.altered.length).toBe(1);
    expect(db.altered[0]).toContain('oracle_text');
  });

  it('is a no-op when the column already exists', () => {
    const db = fakeDb(['id', 'name', 'oracle_text']);
    expect(ensureCardsOracleTextColumn(db)).toBe(false);
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
    expect(ensureCardsOracleTextColumn(db)).toBe(false);
    expect(db.altered.length).toBe(0);
  });
});
