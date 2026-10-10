// Local persistence of session state (DC-080), see docs/implementation-plan-slice-1.md, §6.
// Campaign data itself is not stored; it comes from the seed in this slice.

/** Runtime state of one campaign. `activeCombat` is added with combat persistence (DC-081). */
export type SessionState = {
  campaignId: string;
  currentSceneId: string;
};

// The version is part of the key: a new schema gets a new key, and old data is ignored.
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

function isSessionState(value: unknown): value is SessionState {
  if (typeof value !== 'object' || value === null) return false;
  const { campaignId, currentSceneId } = value as Record<string, unknown>;
  return typeof campaignId === 'string' && typeof currentSceneId === 'string';
}
