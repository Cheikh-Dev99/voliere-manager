import type { Timestamp } from 'firebase/firestore';

export function formatFirestoreDate(
  ts: Timestamp | null | undefined,
  style: 'short' | 'long' = 'short',
): string {
  if (!ts || typeof (ts as Timestamp).toDate !== 'function') return '—';
  try {
    const d = (ts as Timestamp).toDate();
    if (style === 'long') {
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}
