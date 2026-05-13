import { Timestamp } from 'firebase/firestore';

/**
 * Formate un Timestamp Firebase en date lisible (fr-SN)
 */
export const formatDate = (ts: Timestamp | null | undefined): string => {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('fr-SN', {
    day  : '2-digit',
    month: '2-digit',
    year : 'numeric',
  });
};

/**
 * Formate un montant en FCFA
 */
export const formatMontant = (montant: number | null): string => {
  if (montant === null || montant === undefined) return '—';
  return new Intl.NumberFormat('fr-SN', {
    style   : 'currency',
    currency: 'XOF',
  }).format(montant);
};

/**
 * Génère un matricule unique pour un pigeon
 * Format : SN-YYYY-NNN
 */
export const genererMatricule = (annee?: number): string => {
  const year    = annee || new Date().getFullYear();
  const random  = Math.floor(Math.random() * 999) + 1;
  return `SN-${year}-${String(random).padStart(3, '0')}`;
};

/**
 * Calcule l'âge d'un pigeon en années/mois
 */
export const calculerAge = (dateNaissance: Timestamp | null): string => {
  if (!dateNaissance) return '—';
  const now     = new Date();
  const birth   = dateNaissance.toDate();
  const diffMs  = now.getTime() - birth.getTime();
  const diffMois = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));

  if (diffMois < 1)  return 'Moins d\'1 mois';
  if (diffMois < 12) return `${diffMois} mois`;
  const ans = Math.floor(diffMois / 12);
  return `${ans} an${ans > 1 ? 's' : ''}`;
};
