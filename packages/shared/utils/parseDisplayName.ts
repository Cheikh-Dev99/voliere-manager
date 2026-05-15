/** Découpe un nom complet Google / Firebase en prénom + nom. */
export function parseDisplayName(displayName: string | null | undefined): { prenom: string; nom: string } {
  const trimmed = (displayName ?? '').trim();
  if (!trimmed) return { prenom: '', nom: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { prenom: parts[0], nom: '' };
  return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}
