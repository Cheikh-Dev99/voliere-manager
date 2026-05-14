import type { UserProfile } from '@shared/types';

export function profileInitials(profile: UserProfile | null, email: string): string {
  const p = (profile?.prenom ?? '').trim();
  const n = (profile?.nom ?? '').trim();
  if (p || n) {
    const a = p.charAt(0).toUpperCase();
    const b = n.charAt(0).toUpperCase();
    return (a + b).slice(0, 2) || a || '?';
  }
  const em = email.trim();
  if (em.length >= 2) return em.slice(0, 2).toUpperCase();
  return '?';
}

export function profileDisplayName(profile: UserProfile | null, email: string): string {
  const p = (profile?.prenom ?? '').trim();
  const n = (profile?.nom ?? '').trim();
  if (p && n) return `${p} ${n}`;
  if (p) return p;
  if (n) return n;
  const local = email.split('@')[0];
  return local || 'Éleveur';
}

export function profileElevageLabel(profile: UserProfile | null): string {
  const v = (profile?.nomElevage ?? '').trim();
  return v || 'Ma volière';
}
