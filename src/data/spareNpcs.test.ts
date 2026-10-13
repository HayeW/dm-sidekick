import { describe, expect, it } from 'vitest';
import { getSpareNpcs } from './spareNpcs';

describe('DC-090 — Kant-en-klare NPC’s bekijken: de selectie', () => {
  const npcs = getSpareNpcs();

  it('offers a real selection to choose from', () => {
    expect(npcs.length).toBeGreaterThanOrEqual(15);
  });

  it('gives every NPC a unique id', () => {
    const ids = npcs.map((npc) => npc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every NPC a name, a race and a description', () => {
    for (const npc of npcs) {
      expect(npc.name.trim(), npc.id).not.toBe('');
      expect(npc.race.trim(), npc.id).not.toBe('');
      expect(npc.description.trim(), npc.id).not.toBe('');
    }
  });

  it('keeps every description very short: at most 160 characters', () => {
    for (const npc of npcs) {
      expect(npc.description.length, npc.id).toBeLessThanOrEqual(160);
    }
  });
});
