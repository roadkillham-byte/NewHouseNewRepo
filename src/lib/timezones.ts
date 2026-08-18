/**
 * The timezone list offered in settings.
 *
 * `Intl.supportedValuesOf("timeZone")` returns ~600 zones, which is a
 * miserable select to scroll on a phone. Node has supported it since 18, but
 * it's still worth guarding — a runtime without it should fall back rather
 * than crash the settings page.
 */
const FALLBACK_ZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Hobart",
  "Australia/Darwin",
  "Pacific/Auckland",
  "Europe/London",
  "Europe/Dublin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Tokyo",
  "UTC",
];

export function listTimeZones(): string[] {
  const supported = (
    Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf?.("timeZone");

  if (!supported || supported.length === 0) return FALLBACK_ZONES;

  // Put the zones an Australian share house actually needs at the top, then
  // everything else alphabetically.
  const preferred = FALLBACK_ZONES.filter((z) => supported.includes(z));
  const rest = supported.filter((z) => !preferred.includes(z)).sort();
  return [...preferred, ...rest];
}
