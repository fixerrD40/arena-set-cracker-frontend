import {
  CARD_HOVER_GAP,
  CARD_HOVER_VIEWPORT_RATIO,
  MTG_CARD_ASPECT,
  placeCardHoverPreview
} from './card-hover-preview.layout';

describe('placeCardHoverPreview', () => {
  const viewportHeight = 1000;
  const expectedH = CARD_HOVER_VIEWPORT_RATIO * viewportHeight;
  const expectedW = expectedH * MTG_CARD_ASPECT;

  it('places beside on the right and centers mid-band vertically', () => {
    const box = placeCardHoverPreview({
      mode: 'beside',
      side: 'right',
      anchor: { top: 400, left: 100, right: 200, bottom: 520, width: 100, height: 120 },
      bandY: { top: 40, bottom: 960 },
      viewportHeight
    });

    expect(box.width).toBeCloseTo(expectedW);
    expect(box.height).toBeCloseTo(expectedH);
    expect(box.left).toBe(200 + CARD_HOVER_GAP);
    expect(box.top).toBeCloseTo(460 - expectedH / 2);
  });

  it('places beside on the left of a sidebar edge', () => {
    const sidebarLeft = 800;
    const box = placeCardHoverPreview({
      mode: 'beside',
      side: 'left',
      anchor: { top: 300, left: sidebarLeft, right: 1120, bottom: 340, width: 320, height: 40 },
      bandY: { top: 80, bottom: 900 },
      viewportHeight
    });

    expect(box.left).toBeCloseTo(sidebarLeft - CARD_HOVER_GAP - expectedW);
  });

  it('pins to the top of the vertical band for high anchors', () => {
    const bandY = { top: 80, bottom: 900 };
    const box = placeCardHoverPreview({
      mode: 'beside',
      side: 'left',
      anchor: { top: 90, left: 800, right: 1120, bottom: 130, width: 320, height: 40 },
      bandY,
      viewportHeight
    });

    expect(box.top).toBe(bandY.top);
  });

  it('pins to the bottom of the vertical band for low anchors', () => {
    const bandY = { top: 80, bottom: 900 };
    const box = placeCardHoverPreview({
      mode: 'beside',
      side: 'left',
      anchor: { top: 860, left: 800, right: 1120, bottom: 900, width: 320, height: 40 },
      bandY,
      viewportHeight
    });

    expect(box.top).toBeCloseTo(bandY.bottom - expectedH);
  });

  it('shrinks when the vertical band is shorter than 60vh', () => {
    const bandY = { top: 100, bottom: 400 };
    const box = placeCardHoverPreview({
      mode: 'beside',
      side: 'right',
      anchor: { top: 200, left: 50, right: 150, bottom: 300, width: 100, height: 100 },
      bandY,
      viewportHeight
    });

    expect(box.height).toBe(300);
    expect(box.width).toBeCloseTo(300 * MTG_CARD_ASPECT);
    expect(box.top).toBe(bandY.top);
  });

  it('centers horizontally in band-x and pins to the left for edge columns', () => {
    const bandX = { left: 40, right: 960 };
    const bandY = { top: 80, bottom: 720 };
    const mid = placeCardHoverPreview({
      mode: 'band-x',
      anchor: { top: 300, left: 420, right: 520, bottom: 440, width: 100, height: 140 },
      bandX,
      bandY,
      viewportHeight
    });
    expect(mid.left).toBeCloseTo(470 - expectedW / 2);

    const edge = placeCardHoverPreview({
      mode: 'band-x',
      anchor: { top: 300, left: 50, right: 150, bottom: 440, width: 100, height: 140 },
      bandX,
      bandY,
      viewportHeight
    });
    expect(edge.left).toBe(bandX.left);
  });

  it('pins band-x to the right for rightmost columns', () => {
    const bandX = { left: 40, right: 960 };
    const bandY = { top: 80, bottom: 720 };
    const box = placeCardHoverPreview({
      mode: 'band-x',
      anchor: { top: 300, left: 850, right: 950, bottom: 440, width: 100, height: 140 },
      bandX,
      bandY,
      viewportHeight
    });

    expect(box.left).toBeCloseTo(bandX.right - expectedW);
  });

  it('clamps beside-right into bandX so the preview stays on screen', () => {
    const bandX = { left: 0, right: 1000 };
    const box = placeCardHoverPreview({
      mode: 'beside',
      side: 'right',
      anchor: { top: 400, left: 820, right: 920, bottom: 520, width: 100, height: 120 },
      bandY: { top: 40, bottom: 960 },
      bandX,
      gap: 4,
      viewportHeight
    });

    expect(box.left + box.width).toBeLessThanOrEqual(bandX.right);
    expect(box.left).toBeCloseTo(bandX.right - expectedW);
  });

  it('lifts band-x above the anchor so the tile stays visible', () => {
    const viewportH = 500;
    const height = CARD_HOVER_VIEWPORT_RATIO * viewportH;
    const bandX = { left: 40, right: 960 };
    const bandY = { top: 20, bottom: 980 };
    const anchor = { top: 400, left: 420, right: 520, bottom: 540, width: 100, height: 140 };
    const box = placeCardHoverPreview({
      mode: 'band-x',
      anchor,
      bandX,
      bandY,
      clearAnchor: 'above',
      viewportHeight: viewportH
    });

    expect(box.height).toBeCloseTo(height);
    expect(box.top + box.height).toBeLessThanOrEqual(anchor.top);
  });
});
