import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Combat } from '../domain/combat';
import { loadSession, saveActiveCombat, saveCurrentScene, saveSession } from './storage';

const key = 'dm-sidekick:v1:session:c-1';

describe('DC-080 — Current scene lokaal bewaren', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads a saved session back (round trip)', () => {
    saveSession({ campaignId: 'c-1', currentSceneId: 's-2' });

    expect(loadSession('c-1')).toEqual({ campaignId: 'c-1', currentSceneId: 's-2' });
  });

  it('keeps one session per campaign', () => {
    saveSession({ campaignId: 'c-1', currentSceneId: 's-2' });
    saveSession({ campaignId: 'c-2', currentSceneId: 's-9' });

    expect(loadSession('c-1')?.currentSceneId).toBe('s-2');
    expect(loadSession('c-2')?.currentSceneId).toBe('s-9');
  });

  it('has no session for a campaign that was never opened', () => {
    expect(loadSession('c-1')).toBeUndefined();
  });

  it('ignores invalid JSON', () => {
    localStorage.setItem(key, '{not json');

    expect(loadSession('c-1')).toBeUndefined();
  });

  it('ignores data with the wrong shape', () => {
    localStorage.setItem(key, JSON.stringify({ campaignId: 'c-1', currentSceneId: 42 }));

    expect(loadSession('c-1')).toBeUndefined();
  });

  it('ignores a session that belongs to another campaign', () => {
    localStorage.setItem(key, JSON.stringify({ campaignId: 'c-2', currentSceneId: 's-1' }));

    expect(loadSession('c-1')).toBeUndefined();
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });

    expect(() => saveSession({ campaignId: 'c-1', currentSceneId: 's-1' })).not.toThrow();
    expect(loadSession('c-1')).toBeUndefined();
  });
});

describe('DC-081 — Combat lokaal bewaren', () => {
  const combat: Combat = {
    campaignId: 'c-1',
    sceneId: 's-2',
    encounterId: 'enc-1',
    combatants: [
      { id: 'enemy:1', name: 'Goblin 1', type: 'ENEMY', hp: 3, maxHp: 7 },
      { id: 'pc:pc-aria', name: 'Aria', type: 'PLAYER', hp: null, maxHp: null },
    ],
  };

  it('loads a saved combat back (round trip)', () => {
    saveActiveCombat(combat);

    expect(loadSession('c-1')?.activeCombat).toEqual(combat);
  });

  it('keeps the current scene when the combat is saved', () => {
    saveCurrentScene('c-1', 's-3');
    saveActiveCombat(combat);

    expect(loadSession('c-1')?.currentSceneId).toBe('s-3');
  });

  it("uses the combat's scene as current scene when there is no session yet", () => {
    saveActiveCombat(combat);

    expect(loadSession('c-1')?.currentSceneId).toBe('s-2');
  });

  it('keeps the active combat when the current scene changes', () => {
    saveActiveCombat(combat);
    saveCurrentScene('c-1', 's-3');

    expect(loadSession('c-1')).toEqual({
      campaignId: 'c-1',
      currentSceneId: 's-3',
      activeCombat: combat,
    });
  });

  it('treats a session without a combat as "no active combat"', () => {
    saveCurrentScene('c-1', 's-1');

    expect(loadSession('c-1')).toEqual({ campaignId: 'c-1', currentSceneId: 's-1' });
  });

  it('ignores a session with a combat of the wrong shape', () => {
    const broken = { ...combat, combatants: [{ id: 'enemy:1', name: 'Goblin 1', hp: '3' }] };
    localStorage.setItem(
      key,
      JSON.stringify({ campaignId: 'c-1', currentSceneId: 's-1', activeCombat: broken }),
    );

    expect(loadSession('c-1')).toBeUndefined();
  });

  it('ignores a saved player character with HP (D3)', () => {
    const broken = {
      ...combat,
      combatants: [{ id: 'pc:pc-aria', name: 'Aria', type: 'PLAYER', hp: 10, maxHp: 10 }],
    };
    localStorage.setItem(
      key,
      JSON.stringify({ campaignId: 'c-1', currentSceneId: 's-1', activeCombat: broken }),
    );

    expect(loadSession('c-1')).toBeUndefined();
  });

  it('ignores a session with a combat of another campaign', () => {
    localStorage.setItem(
      key,
      JSON.stringify({
        campaignId: 'c-1',
        currentSceneId: 's-1',
        activeCombat: { ...combat, campaignId: 'c-2' },
      }),
    );

    expect(loadSession('c-1')).toBeUndefined();
  });
});
