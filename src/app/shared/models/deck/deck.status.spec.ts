import { coerceDeckStatus, coerceDeckThemes } from './deck';

describe('coerceDeckStatus', () => {
  it('keeps a sealed status', () => {
    expect(coerceDeckStatus('final')).toBe('final');
    expect(coerceDeckStatus('needs-work')).toBe('needs-work');
    expect(coerceDeckStatus('concept')).toBe('concept');
  });

  it('falls back to concept', () => {
    expect(coerceDeckStatus('aggro')).toBe('concept');
    expect(coerceDeckStatus(undefined)).toBe('concept');
  });
});

describe('coerceDeckThemes', () => {
  it('keeps non-empty strings', () => {
    expect(coerceDeckThemes(['draw', ''])).toEqual(['draw']);
  });

  it('treats missing values as none', () => {
    expect(coerceDeckThemes(undefined)).toEqual([]);
    expect(coerceDeckThemes('draw')).toEqual([]);
  });
});
