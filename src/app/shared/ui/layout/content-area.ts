/** Router-outlet shell under the app toolbar — see `data-app-content` in app.html. */
export const APP_CONTENT_SELECTOR = '[data-app-content]';

export type ContentAreaBox = Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;

/** Live bounds of the main content area; null if the shell is not mounted. */
export function contentAreaBox(): ContentAreaBox | null {
  const el = document.querySelector(APP_CONTENT_SELECTOR);
  if (!(el instanceof HTMLElement)) return null;
  const box = el.getBoundingClientRect();
  return {
    top: box.top,
    left: box.left,
    right: box.right,
    bottom: box.bottom,
    width: box.width,
    height: box.height
  };
}
