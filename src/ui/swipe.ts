import { useRef } from 'react';
import type { TouchEvent } from 'react';

export type SwipeDirection = 'left' | 'right';

/** Minimum sideways finger movement, in px, before a touch counts as a swipe. */
export const MIN_SWIPE_DISTANCE = 50;

/**
 * DC-017: turns a finger movement into a swipe direction. Undefined when the movement is
 * too short or not clearly sideways, so scrolling a long text never counts as a swipe.
 */
export function swipeDirection(dx: number, dy: number): SwipeDirection | undefined {
  if (Math.abs(dx) < MIN_SWIPE_DISTANCE) return undefined;
  if (Math.abs(dx) < 2 * Math.abs(dy)) return undefined;
  return dx < 0 ? 'left' : 'right';
}

/** Touch handlers that call onSwipe for a one-finger horizontal swipe. */
export function useSwipe(onSwipe: (direction: SwipeDirection) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      // A second finger means zooming, not swiping. While zoomed in, one finger pans the
      // text sideways, so that isn't a swipe either.
      // Small tolerance: some browsers report e.g. 1.0000001 after zooming back out.
      const zoomedIn = (window.visualViewport?.scale ?? 1) > 1.01;
      start.current =
        !zoomedIn && event.touches.length === 1 && touch
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    },
    onTouchEnd(event: TouchEvent) {
      const from = start.current;
      const touch = event.changedTouches[0];
      start.current = null;
      if (!from || !touch) return;
      const direction = swipeDirection(touch.clientX - from.x, touch.clientY - from.y);
      if (direction) onSwipe(direction);
    },
    onTouchCancel() {
      start.current = null;
    },
  };
}
