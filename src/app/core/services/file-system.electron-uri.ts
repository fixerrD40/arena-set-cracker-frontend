/** Origin of the Electron shell in desktop.js. Art is same-origin, so img src is root-relative. */
export const ELECTRON_APP_ORIGIN = 'app://localhost';

/** Maps a cwd-relative cached_art path to a same-origin URL on the app:// window. */
export function electronArtWebViewUri(stored: string): string {
  if (!stored) {
    return stored;
  }
  if (/^https?:\/\//i.test(stored)) {
    return stored;
  }

  const posix = stored.replace(/\\/g, '/');
  if (posix.startsWith(`${ELECTRON_APP_ORIGIN}/cached_art/`)) {
    return posix.slice(ELECTRON_APP_ORIGIN.length);
  }
  if (posix.startsWith('/cached_art/')) {
    return posix;
  }
  if (posix.startsWith('cached_art/')) {
    return `/${posix}`;
  }

  return stored;
}
