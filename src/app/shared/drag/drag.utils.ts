const CLICK_DRAG_PX = 8;

export function dragClientPoint(event: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('clientX' in event) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.touches[0] || event.changedTouches[0];
  return { x: touch.clientX, y: touch.clientY };
}

export function isDragGesture(distance: { x: number; y: number }): boolean {
  return Math.hypot(distance.x, distance.y) >= CLICK_DRAG_PX;
}

/** elementFromPoint + closest; null when the event has no usable client point. */
export function hitClosest(event: MouseEvent | TouchEvent, selector: string): Element | null {
  const { x, y } = dragClientPoint(event);
  return document.elementFromPoint(x, y)?.closest(selector) ?? null;
}
