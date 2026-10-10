import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSession, saveSession } from './storage';

const key = 'dm-cockpit:v1:session:c-1';

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
