// Local persistence of session state (DC-080, DC-081), see docs/implementation-plan-slice-1.md, §6.
// Campaign data itself is not stored; it comes from the seed in this slice.

import type { Combat, Combatant } from '../domain/combat';

/** Runtime state of one campaign. Without `activeCombat` there is no active combat. */
export type SessionState = {
  campaignId: string;
  currentSceneId: string;
  activeCombat?: Combat;
};

// The version is part of the key: a new schema gets a new key, and old data is ignored.
// `activeCombat` is optional, so sessions saved before it existed stay valid.
const keyFor = (campaignId: string) => `dm-cockpit:v1:session:${campaignId}`;

/**
 * The stored session of a campaign, or undefined when there is none, or when it is invalid
 * or unreadable — the app then starts fresh for that campaign.
 */
export function loadSession(campaignId: string): SessionState | undefined {
  try {
    const raw = localStorage.getItem(keyFor(campaignId));
    if (raw === null) return undefined;
    const value: unknown = JSON.parse(raw);
    return isSessionState(value) && value.campaignId === campaignId ? value : undefined;
  } catch {
    // Storage blocked (e.g. some private modes) or invalid JSON.
    return undefined;
  }
}

/** Stores the session. Failures (storage full or blocked) never break the app. */
export function saveSession(session: SessionState): void {
  try {
    localStorage.setItem(keyFor(session.campaignId), JSON.stringify(session));
  } catch {
    // Not being able to remember the scene is not worth interrupting the game for.
  }
}

/** Remembers the current scene (DC-080), keeping the campaign's active combat. */
export function saveCurrentScene(campaignId: string, currentSceneId: string): void {
  const activeCombat = loadSession(campaignId)?.activeCombat;
  saveSession({ campaignId, currentSceneId, ...(activeCombat && { activeCombat }) });
}

/** Remembers the campaign's active combat (DC-081), keeping the current scene. */
export function saveActiveCombat(combat: Combat): void {
  const currentSceneId = loadSession(combat.campaignId)?.currentSceneId ?? combat.sceneId;
  saveSession({ campaignId: combat.campaignId, currentSceneId, activeCombat: combat });
}

function isSessionState(value: unknown): value is SessionState {
  if (typeof value !== 'object' || value === null) return false;
  const { campaignId, currentSceneId, activeCombat } = value as Record<string, unknown>;
  return (
    typeof campaignId === 'string' &&
    typeof currentSceneId === 'string' &&
    (activeCombat === undefined ||
      (isCombat(activeCombat) && activeCombat.campaignId === campaignId))
  );
}

function isCombat(value: unknown): value is Combat {
  if (typeof value !== 'object' || value === null) return false;
  const { campaignId, sceneId, encounterId, combatants } = value as Record<string, unknown>;
  return (
    typeof campaignId === 'string' &&
    typeof sceneId === 'string' &&
    (typeof encounterId === 'string' || encounterId === null) &&
    Array.isArray(combatants) &&
    combatants.every(isCombatant)
  );
}

function isCombatant(value: unknown): value is Combatant {
  if (typeof value !== 'object' || value === null) return false;
  const { id, name, type, hp, maxHp } = value as Record<string, unknown>;
  const isHp = (n: unknown) => typeof n === 'number' || n === null;
  if (typeof id !== 'string' || typeof name !== 'string') return false;
  // Player characters never have HP (decision D3).
  if (type === 'PLAYER') return hp === null && maxHp === null;
  return (type === 'ENEMY' || type === 'NPC') && isHp(hp) && isHp(maxHp);
}
