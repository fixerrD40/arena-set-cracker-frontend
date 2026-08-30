import { ELECTRON_APP_ORIGIN, electronArtWebViewUri } from './file-system.electron-uri';

describe('electronArtWebViewUri', () => {
  it('maps a cwd-relative art path to a same-origin root path', () => {
    expect(electronArtWebViewUri('cached_art/ltr/1.png')).toBe('/cached_art/ltr/1.png');
  });

  it('accepts Windows separators in a relative path', () => {
    expect(electronArtWebViewUri('cached_art\\ltr\\1.png')).toBe('/cached_art/ltr/1.png');
  });

  it('leaves https fallbacks and packaged assets alone', () => {
    expect(electronArtWebViewUri('https://cards.scryfall.io/normal/ltr.png')).toBe(
      'https://cards.scryfall.io/normal/ltr.png'
    );
    expect(electronArtWebViewUri('assets/colors/blue.png')).toBe(
      'assets/colors/blue.png'
    );
  });

  it('is a no-op for empty strings and paths already rooted at cached_art', () => {
    expect(electronArtWebViewUri('')).toBe('');
    expect(electronArtWebViewUri('/cached_art/ltr/1.png')).toBe('/cached_art/ltr/1.png');
    expect(electronArtWebViewUri(`${ELECTRON_APP_ORIGIN}/cached_art/ltr/1.png`)).toBe(
      '/cached_art/ltr/1.png'
    );
  });
});
