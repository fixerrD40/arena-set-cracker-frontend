import { ensureSqliteColumns } from './sqlite.ensure-columns';

describe('ensureSqliteColumns', () => {
  it('adds collector_number when missing from an existing cards table', () => {
    const runs: string[] = [];
    const rawDb = {
      exec: (sql: string) => {
        if (sql === 'PRAGMA table_info(cards)') {
          return [
            {
              columns: ['name'],
              values: [['id'], ['set_id'], ['arena_id'], ['scryfall_id'], ['name']]
            }
          ];
        }
        return [];
      },
      run: (sql: string) => {
        runs.push(sql);
      }
    };

    expect(ensureSqliteColumns(rawDb)).toBe(true);
    expect(runs).toEqual([
      `ALTER TABLE cards ADD COLUMN collector_number text NOT NULL DEFAULT ''`
    ]);
  });

  it('is a no-op when collector_number already exists', () => {
    const runs: string[] = [];
    const rawDb = {
      exec: (sql: string) => {
        if (sql === 'PRAGMA table_info(cards)') {
          return [
            {
              columns: ['name'],
              values: [['id'], ['collector_number']]
            }
          ];
        }
        return [];
      },
      run: (sql: string) => {
        runs.push(sql);
      }
    };

    expect(ensureSqliteColumns(rawDb)).toBe(false);
    expect(runs).toEqual([]);
  });
});
