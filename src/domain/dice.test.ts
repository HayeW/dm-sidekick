import { describe, expect, it } from 'vitest';
import { rollD20 } from './dice';

describe('DC-050 — Enemy initiative rollen', () => {
  it('rolls 1 for the lowest random value', () => {
    expect(rollD20(() => 0)).toBe(1);
  });

  it('rolls 20 for the highest random value', () => {
    expect(rollD20(() => 0.999999)).toBe(20);
  });

  it('spreads random values evenly over 1 to 20', () => {
    expect(rollD20(() => 0.5)).toBe(11);
    expect(rollD20(() => 0.049)).toBe(1);
    expect(rollD20(() => 0.05)).toBe(2);
  });
});
