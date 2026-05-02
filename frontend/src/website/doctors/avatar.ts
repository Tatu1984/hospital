/**
 * Deterministic placeholder avatar URLs for doctor cards.
 *
 * We don't have actual doctor photos — and licensed stock images of South
 * Asian medical professionals are scarce — so we generate clean illustrated
 * portraits with DiceBear. Same name → same avatar across every visit, which
 * is what we want: the doctor on the home-page teaser, the doctors index,
 * and the service detail page should all look identical.
 *
 * "personas" is the DiceBear style we picked: simple, professional,
 * non-distracting. If/when real photos arrive, swap this helper to return
 * `/doctors/<slug>.jpg` from public/, and the rest of the site keeps working.
 */

const STYLE = 'personas';
const COLORS = ['ccfbf1', 'a7f3d0', 'bae6fd', 'fce7f3', 'fef3c7', 'e9d5ff'];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function doctorAvatarUrl(name: string, size = 320): string {
  const seed = encodeURIComponent(name);
  const bg = COLORS[hashString(name) % COLORS.length];
  return `https://api.dicebear.com/7.x/${STYLE}/svg?seed=${seed}&backgroundColor=${bg}&size=${size}&radius=0`;
}
