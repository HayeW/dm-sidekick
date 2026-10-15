import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Combat } from '../domain/combat';
import { clearActiveCombats, endActiveCombat, getActiveCombat, setActiveCombat } from './combats';
import { loadSession, saveCurrentScene } from './storage';

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

describe('DC-072 — Combat beëindigen: de data', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ends the active combat, also after a refresh', () => {
    setActiveCombat(combat('c-1'));

    endActiveCombat('c-1');

    expect(getActiveCombat('c-1')).toBeUndefined();
    clearActiveCombats(); // page refresh
    expect(getActiveCombat('c-1')).toBeUndefined();
  });

  it('keeps the current scene (D66)', () => {
    setActiveCombat(combat('c-1', 's-1'));
    saveCurrentScene('c-1', 's-3');

    endActiveCombat('c-1');

    expect(loadSession('c-1')).toEqual({ campaignId: 'c-1', currentSceneId: 's-3' });
  });

  it("keeps other campaigns' combats", () => {
    setActiveCombat(combat('c-1'));
    setActiveCombat(combat('c-2'));

    endActiveCombat('c-1');

    expect(getActiveCombat('c-2')?.campaignId).toBe('c-2');
    clearActiveCombats();
    expect(getActiveCombat('c-2')?.campaignId).toBe('c-2');
  });

  it('changes nothing for a campaign without a combat', () => {
    saveCurrentScene('c-1', 's-2');

    endActiveCombat('c-1');
    endActiveCombat('c-9');

    expect(loadSession('c-1')).toEqual({ campaignId: 'c-1', currentSceneId: 's-2' });
    expect(loadSession('c-9')).toBeUndefined();
  });

  it('lets a new combat start after it', () => {
    setActiveCombat(combat('c-1', 's-1'));
    endActiveCombat('c-1');

    setActiveCombat(combat('c-1', 's-2'));

    expect(getActiveCombat('c-1')?.sceneId).toBe('s-2');
  });

  it('ends the combat for the rest of the visit when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setActiveCombat(combat('c-1')); // only in memory
    expect(getActiveCombat('c-1')).toBeDefined();

    expect(() => endActiveCombat('c-1')).not.toThrow();
    expect(getActiveCombat('c-1')).toBeUndefined();
  });
});
