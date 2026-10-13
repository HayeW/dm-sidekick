import { describe, expect, it } from 'vitest';
import { dropIndex } from './dragReorder';

describe('DC-064 / DC-052 — Combatant verplaatsen (slepen, D21)', () => {
  // Four rows, 60 px apart: middles at 30, 90, 150, 210.
  const middles = [30, 90, 150, 210];

  it('stays in place when not dragged past a neighbour’s middle', () => {
    expect(dropIndex(middles, 1, 90)).toBe(1);
    expect(dropIndex(middles, 1, 89 + 60)).toBe(1);
    expect(dropIndex(middles, 1, 91 - 60)).toBe(1);
  });

  it('moves down past every row whose middle it passed', () => {
    expect(dropIndex(middles, 0, 151)).toBe(2);
    expect(dropIndex(middles, 0, 500)).toBe(3);
  });

  it('moves up past every row whose middle it passed', () => {
    expect(dropIndex(middles, 3, 89)).toBe(1);
    expect(dropIndex(middles, 3, -100)).toBe(0);
  });
});
