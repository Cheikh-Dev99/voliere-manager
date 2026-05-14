import type { Timestamp } from 'firebase/firestore';

export function ageDepuisNaissance(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  const n = ts.toDate();
  const diff = Date.now() - n.getTime();
  const ans = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  if (ans < 1) return '< 1 an';
  return `${ans} an${ans > 1 ? 's' : ''}`;
}

export function formatEventTime(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  try {
    return ts.toDate().toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function formatCalendarDate(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  try {
    return ts.toDate().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
