/**
 * Doctor portrait URLs.
 *
 * For real, photographic-style portraits we use randomuser.me — a free
 * service that serves AI-generated portraits ("real-looking but not real
 * people"). URLs are deterministic by index so the same doctor always
 * appears with the same face across the site.
 *
 * The 12 named consultants in the demo have a hand-picked
 * (gender, portraitId) pair — chosen so each face looks like a different
 * mid-career professional. Unknown names fall back to a hash-derived pick.
 *
 * To swap in real hospital photos:
 *   1. Drop them in frontend/public/doctors/<slug>.jpg
 *   2. Add an entry below: ['Dr. Real Name', { src: '/doctors/real-name.jpg' }]
 *   3. The src field, when present, wins over (gender, portraitId).
 */

interface PortraitPick {
  /** Override URL — when set, returned verbatim. */
  src?: string;
  gender?: 'men' | 'women';
  /** randomuser.me portrait index 0-99. */
  portraitId?: number;
}

// Hand-picked so each consultant has a distinct face. Indices chosen from
// the 30-90 range — those tend to look like working professionals rather
// than students or retirees.
const KNOWN: Record<string, PortraitPick> = {
  'Dr. Sarbari Mukherjee':  { gender: 'women', portraitId: 65 },
  'Dr. Rohan Banerjee':     { gender: 'men',   portraitId: 32 },
  'Dr. Priyanka Roy':       { gender: 'women', portraitId: 44 },
  'Dr. Anuradha Sen':       { gender: 'women', portraitId: 79 },
  'Dr. Vikram Das':         { gender: 'men',   portraitId: 41 },
  'Dr. Mitra Ghosh':        { gender: 'women', portraitId: 58 },
  'Dr. Abhik Pal':          { gender: 'men',   portraitId: 53 },
  'Dr. Nandita Roy':        { gender: 'women', portraitId: 36 },
  'Dr. Joydeep Sarkar':     { gender: 'men',   portraitId: 67 },
  'Dr. Tanya Saha':         { gender: 'women', portraitId: 21 },
  'Dr. Imran Mondal':       { gender: 'men',   portraitId: 74 },
  'Dr. Lakshmi Ray':        { gender: 'women', portraitId: 12 },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function doctorAvatarUrl(name: string): string {
  const known = KNOWN[name];
  if (known?.src) return known.src;

  const h = hashString(name);
  const gender = known?.gender ?? (h % 2 === 0 ? 'men' : 'women');
  // randomuser.me portrait IDs run 0-99 per gender. Bias toward 30-90 by
  // taking the hash mod 60 then offsetting.
  const portraitId = known?.portraitId ?? (h % 60) + 30;
  return `https://randomuser.me/api/portraits/${gender}/${portraitId}.jpg`;
}
