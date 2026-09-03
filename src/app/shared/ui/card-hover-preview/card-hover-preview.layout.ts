/** Official MTG frame ratio (63mm × 88mm). */
export const MTG_CARD_ASPECT = 63 / 88;

/** Framed hover height as a fraction of the viewport. */
export const CARD_HOVER_VIEWPORT_RATIO = 0.6;

export const CARD_HOVER_GAP = 12;

/** Collection tiles sit the enlarge immediately beside the thumb. */
export const CARD_HOVER_GAP_TIGHT = 4;

export type RectLike = Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;

export type CardHoverPlacement =
  | {
      mode: 'beside';
      side: 'left' | 'right';
      anchor: RectLike;
      bandY: { top: number; bottom: number };
      /** Horizontal clamp — right-edge library tiles must not leave the window. */
      bandX?: { left: number; right: number };
      gap?: number;
      viewportHeight: number;
    }
  | {
      mode: 'band-x';
      anchor: RectLike;
      bandX: { left: number; right: number };
      bandY: { top: number; bottom: number };
      /** Prefer clearing the tile; default centers on midY. */
      clearAnchor?: 'center' | 'above';
      viewportHeight: number;
    };

export type CardHoverBox = { top: number; left: number; width: number; height: number };

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, n));
}

function sizedCard(
  viewportHeight: number,
  maxHeight: number,
  maxWidth: number
): { width: number; height: number } {
  // Official size first; shrink only when that box cannot fit the clamp band.
  let height = CARD_HOVER_VIEWPORT_RATIO * viewportHeight;
  let width = height * MTG_CARD_ASPECT;
  if (height > maxHeight && maxHeight > 0) {
    height = maxHeight;
    width = height * MTG_CARD_ASPECT;
  }
  if (width > maxWidth && maxWidth > 0) {
    width = maxWidth;
    height = width / MTG_CARD_ASPECT;
  }
  return { width, height };
}

export function placeCardHoverPreview(placement: CardHoverPlacement): CardHoverBox {
  if (placement.mode === 'beside') {
    const gap = placement.gap ?? CARD_HOVER_GAP;
    const maxH = placement.bandY.bottom - placement.bandY.top;
    const maxW = placement.bandX ? placement.bandX.right - placement.bandX.left : Number.POSITIVE_INFINITY;
    const { width, height } = sizedCard(placement.viewportHeight, maxH, maxW);
    const midY = placement.anchor.top + placement.anchor.height / 2;
    const top = clamp(midY - height / 2, placement.bandY.top, placement.bandY.bottom - height);
    let left =
      placement.side === 'right'
        ? placement.anchor.right + gap
        : placement.anchor.left - gap - width;
    if (placement.bandX) {
      left = clamp(left, placement.bandX.left, placement.bandX.right - width);
    }
    return { top, left, width, height };
  }

  const maxH = placement.bandY.bottom - placement.bandY.top;
  const maxW = placement.bandX.right - placement.bandX.left;
  const { width, height } = sizedCard(placement.viewportHeight, maxH, maxW);
  const midX = placement.anchor.left + placement.anchor.width / 2;
  const midY = placement.anchor.top + placement.anchor.height / 2;
  const left = clamp(midX - width / 2, placement.bandX.left, placement.bandX.right - width);
  const idealTop =
    placement.clearAnchor === 'above'
      ? placement.anchor.top - CARD_HOVER_GAP - height
      : midY - height / 2;
  const top = clamp(idealTop, placement.bandY.top, placement.bandY.bottom - height);
  return { top, left, width, height };
}

/** Fine pointer only — touch has no hover, and a stuck overlay fights tap/drag. */
export function prefersFineHover(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
}
