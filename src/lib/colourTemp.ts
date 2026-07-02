// Pulls a light fixture's colour temperature (e.g. "4000K Warm White") out of
// whatever the research data happened to capture it in — a dedicated spec
// (the common case going forward, per the lighting system prompt) or, for
// older approved items researched before that spec was mandated, embedded in
// the free-text colour field (e.g. "Black / Warm white 2700K").

const SPEC_KEY_RE = /colour temp|color temp|\bcct\b|kelvin|light colour|light color/i
const KELVIN_RE = /(?:(?:warm|cool|neutral|daylight)\s+white\s+)?\d{3,4}\s?k\b(?:\s+(?:warm|cool|neutral|daylight)(?:\s+white)?)?/i

export function extractColourTemp(item: { colour?: string; specs?: Record<string, string> }): string {
  if (item.specs) {
    for (const [key, value] of Object.entries(item.specs)) {
      if (SPEC_KEY_RE.test(key)) return value
    }
  }
  const match = item.colour?.match(KELVIN_RE)
  return match ? match[0].trim() : ''
}
