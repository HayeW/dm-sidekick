import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Combat } from '../domain/combat';
import { clearActiveCombats, getActiveCombat, setActiveCombat } from './combats';

const combat = (campaignId: string, sceneId = 's-1'): Combat => ({
  campaignId,
  sceneId,
  encounterId: 'enc-1',
  combatants: [],
});

describe('DC-043 — Combat rechtstreeks starten', () => {
  it('has no active combat for a campaign by default', () => {
    expect(getActiveCombat('c-1')).toBeUndefined();
  });

  it('keeps the active combat per campaign', () => {
    setActiveCombat(combat('c-1'));

    expect(getActiveCombat('c-1')?.campaignId).toBe('c-1');
    expect(getActiveCombat('c-2')).toBeUndefined();
  });

  it('keeps only one active combat per campaign (D1)', () => {
    setActiveCombat(combat('c-1', 's-1'));
    setActiveCombat(combat('c-1', 's-2'));

    expect(getActiveCombat('c-1')?.sceneId).toBe('s-2');
  });
});

describe('DC-081 — Combat lokaal bewaren', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the active combat after a refresh', () => {
    setActiveCombat(combat('c-1', 's-2'));
    clearActiveCombats(); // page refresh: memory is gone, storage stays

    expect(getActiveCombat('c-1')?.sceneId).toBe('s-2');
  });

  it('keeps working for the rest of the visit when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setActiveCombat(combat('c-1'));

    expect(getActiveCombat('c-1')?.campaignId).toBe('c-1');
  });
});
