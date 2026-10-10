import { describe, expect, it } from 'vitest';
import { MIN_SWIPE_DISTANCE, swipeDirection } from './swipe';

describe('DC-017 — Swipen tussen beschrijvingen', () => {
  it('sees a finger moving left as a swipe left', () => {
    expect(swipeDirection(-80, 5)).toBe('left');
  });

  it('sees a finger moving right as a swipe right', () => {
    expect(swipeDirection(80, -5)).toBe('right');
  });

  it('ignores movements shorter than the minimum distance', () => {
    expect(swipeDirection(-(MIN_SWIPE_DISTANCE - 1), 0)).toBeUndefined();
    expect(swipeDirection(MIN_SWIPE_DISTANCE, 0)).toBe('right');
  });

  it('ignores mostly vertical movements (scrolling)', () => {
    expect(swipeDirection(-60, 200)).toBeUndefined();
    expect(swipeDirection(80, 41)).toBeUndefined();
    expect(swipeDirection(80, 40)).toBe('right');
  });
});
