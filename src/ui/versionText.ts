const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The version line at the bottom of the campaign list (D74): which build the phone runs.
 * `buildDate` is an ISO date ('2026-10-15'); the month is spelled out so the date reads the
 * same in every locale.
 */
export function versionText(version: string, buildDate: string): string {
  const [year, month, day] = buildDate.split('-').map(Number);
  return `Version ${version} · ${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}
