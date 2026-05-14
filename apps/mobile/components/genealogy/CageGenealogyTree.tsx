import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GitBranch } from 'lucide-react-native';

import type { Pigeon } from '@shared/types';

import { theme } from '../../constants/theme';
import { GenealogyForRoot, PigeonSoloAncestorBlock } from './GenealogyForRootView';

function PigeonNotesBlock({ title, notes }: { title: string; notes: string }) {
  const t = (notes ?? '').trim();
  if (!t) return null;
  return (
    <View style={styles.noteBlock}>
      <Text style={styles.noteK}>{title}</Text>
      <Text style={styles.noteTxt}>{t}</Text>
    </View>
  );
}

type Props = {
  mode: 'solo' | 'couple';
  pigeon: Pigeon | null;
  male: Pigeon | null;
  femelle: Pigeon | null;
  pigeonById: ReadonlyMap<string, Pigeon>;
};

function hasAnyParent(p: Pigeon | null | undefined): boolean {
  return Boolean(p?.pereId || p?.mereId);
}

export function CageGenealogyTree({ mode, pigeon, male, femelle, pigeonById }: Props) {
  const router = useRouter();
  const openPigeon = (id: string) => {
    router.push(`/(app)/pigeon/${id}`);
  };

  const hasSingle = mode === 'solo' && pigeon;
  const hasCouple = mode === 'couple' && male && femelle;

  if (!hasSingle && !hasCouple) {
    return (
      <View style={styles.unavailable}>
        <GitBranch size={32} color={theme.slate500} />
        <Text style={styles.unavailableTitle}>Généalogie indisponible</Text>
        <Text style={styles.unavailableSub}>Affecte un pigeon ou un couple pour voir l’arbre ascendant.</Text>
      </View>
    );
  }

  if (hasSingle && pigeon) {
    return (
      <View style={styles.soloWrap}>
        <PigeonNotesBlock title="NOTE" notes={pigeon.notes} />
        <PigeonSoloAncestorBlock pigeon={pigeon} pigeonById={pigeonById} onOpenPigeon={openPigeon} />
      </View>
    );
  }

  if (hasCouple && male && femelle) {
    const mTree = hasAnyParent(male);
    const fTree = hasAnyParent(femelle);
    return (
      <View style={styles.wrap}>
        <Text style={styles.intro}>
          Deux lignées : chaque pigeon du couple a son propre ascendant. Touche une carte pour ouvrir la fiche.
        </Text>
        <View style={styles.coupleCol}>
          <View style={styles.coupleSection}>
            <View style={styles.coupleHeadM}>
              <View style={styles.coupleDotM} />
              <Text style={[styles.coupleHeadTxt, styles.coupleHeadMale]}>Mâle — {male.matricule}</Text>
            </View>
            <PigeonNotesBlock title="NOTE — MÂLE" notes={male.notes} />
            {!mTree ? <Text style={styles.coupleHint}>Parents non renseignés.</Text> : null}
            <GenealogyForRoot rootId={male.id} pigeonById={pigeonById} maxGen={2} onOpenPigeon={openPigeon} />
          </View>
          <View style={styles.coupleDivider} />
          <View style={styles.coupleSection}>
            <View style={styles.coupleHeadF}>
              <View style={styles.coupleDotF} />
              <Text style={[styles.coupleHeadTxt, styles.coupleHeadFem]}>Femelle — {femelle.matricule}</Text>
            </View>
            <PigeonNotesBlock title="NOTE — FEMELLE" notes={femelle.notes} />
            {!fTree ? <Text style={styles.coupleHint}>Parents non renseignés.</Text> : null}
            <GenealogyForRoot rootId={femelle.id} pigeonById={pigeonById} maxGen={2} onOpenPigeon={openPigeon} />
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  soloWrap: { gap: 12 },
  noteBlock: {
    marginBottom: 2,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.slate200,
    backgroundColor: theme.slate50,
    padding: 12,
  },
  noteK: { fontSize: 10, fontWeight: '700', color: theme.slate500, letterSpacing: 0.8 },
  noteTxt: { marginTop: 6, fontSize: 14, color: theme.slate700, lineHeight: 21 },
  intro: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.slate600,
  },
  unavailable: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.slate200,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    padding: 20,
    alignItems: 'center',
  },
  unavailableTitle: { marginTop: 10, fontSize: 15, fontWeight: '700', color: theme.slate600 },
  unavailableSub: { marginTop: 6, fontSize: 12, color: theme.slate500, textAlign: 'center' },
  coupleCol: { gap: 16, marginTop: 4 },
  coupleSection: { gap: 8 },
  coupleDivider: { height: 1, backgroundColor: theme.slate100, marginVertical: 4 },
  coupleHeadM: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coupleHeadF: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coupleDotM: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0ea5e9' },
  coupleDotF: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ec4899' },
  coupleHeadTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  coupleHeadMale: { color: '#075985' },
  coupleHeadFem: { color: '#9f1239' },
  coupleHint: { fontSize: 11, color: theme.slate500, marginBottom: 4 },
});
