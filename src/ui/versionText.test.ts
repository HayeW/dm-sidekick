import { describe, expect, it } from 'vitest';
import { versionText } from './versionText';

describe('DC-100 — Mobile-first: version on the campaign list (D74)', () => {
  it('shows the version and the build date with the month spelled out', () => {
    expect(versionText('0.1.0', '2026-10-15')).toBe('Version 0.1.0 · 15 Oct 2026');
  });

  it('writes the day without a leading zero', () => {
    expect(versionText('1.2.3', '2027-01-05')).toBe('Version 1.2.3 · 5 Jan 2027');
  });
});
