import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { libererCage, obtenirCage } from '@shared/services/cagesService';
import type { Cage, Couple, Pigeon } from '@shared/types';

import { theme } from '../../../constants/theme';

const STATUT_LABEL: Record<string, string> = {
  LIBRE: 'Libre',
  OCCUPE_PIGEON: '1 pigeon',
  OCCUPE_COUPLE: 'Couple',
};

export default function CageDetailScreen() {
  const { cageId: cageIdParam } = useLocalSearchParams<{ cageId: string }>();
  const cageId = Array.isArray(cageIdParam) ? cageIdParam[0] : cageIdParam;
  const router = useRouter();
  const { pigeons } = usePigeons(true);
  const { couples } = useCouples(false);
  const [cage, setCage] = useState<Cage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!cageId) {
      setCage(null);
      setError('Identifiant de cage manquant.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const c = await obtenirCage(cageId);
      setCage(c);
      if (!c) setError('Cage introuvable.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [cageId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pigeonById = useMemo(() => {
    const m = new Map<string, Pigeon>();
    pigeons.forEach((p) => m.set(p.id, p));
    return m;
  }, [pigeons]);

  const coupleById = useMemo(() => {
    const m = new Map<string, Couple>();
    couples.forEach((c) => m.set(c.id, c));
    return m;
  }, [couples]);

  const onLiberer = () => {
    if (!cage || cage.statut === 'LIBRE') return;
    Alert.alert('Libérer la cage', 'Confirmer la libération ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Libérer',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await libererCage(cage.id);
              await reload();
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.teal700} />
      </View>
    );
  }

  if (error || !cage) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? 'Introuvable'}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const pigeon = cage.pigeonId ? pigeonById.get(cage.pigeonId) : null;
  const couple = cage.coupleId ? coupleById.get(cage.coupleId) : null;
  const male = couple ? pigeonById.get(couple.maleId) : null;
  const femelle = couple ? pigeonById.get(couple.femelleId) : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>
        {cage.voliereCode ?? 'A'} · {cage.numero}
      </Text>
      <Text style={styles.badge}>{STATUT_LABEL[cage.statut] ?? cage.statut}</Text>

      <View style={styles.block}>
        <Text style={styles.nom}>{cage.nom}</Text>
        <Text style={styles.meta}>Superficie {cage.superficie} m²</Text>
        {cage.description ? <Text style={styles.desc}>{cage.description}</Text> : null}
      </View>

      <Pressable
        style={styles.editBtn}
        onPress={() => router.push(`/(app)/cage/edit/${cage.id}`)}
        accessibilityRole="button"
        accessibilityLabel="Modifier la cage"
      >
        <Text style={styles.editBtnTxt}>Modifier la cage</Text>
      </Pressable>

      {pigeon ? (
        <Pressable style={styles.block} onPress={() => router.push(`/(app)/pigeon/${pigeon.id}`)}>
          <Text style={styles.section}>Pigeon</Text>
          <Text style={styles.linkText}>
            {pigeon.matricule} — {pigeon.nom}
          </Text>
        </Pressable>
      ) : null}

      {male && femelle ? (
        <View style={styles.block}>
          <Text style={styles.section}>Couple</Text>
          <Pressable onPress={() => router.push(`/(app)/pigeon/${male.id}`)}>
            <Text style={styles.linkText}>♂ {male.matricule} — {male.nom}</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/(app)/pigeon/${femelle.id}`)} style={{ marginTop: 8 }}>
            <Text style={styles.linkText}>♀ {femelle.matricule} — {femelle.nom}</Text>
          </Pressable>
        </View>
      ) : null}

      {cage.statut !== 'LIBRE' ? (
        <Pressable style={[styles.danger, busy && { opacity: 0.6 }]} onPress={onLiberer} disabled={busy}>
          <Text style={styles.dangerTxt}>{busy ? '…' : 'Libérer la cage'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 16, paddingBottom: 40 },
  err: { color: theme.red600, marginBottom: 12 },
  link: { color: theme.teal700, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '900', color: theme.slate900 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: theme.teal100,
    color: theme.teal900,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  block: {
    marginTop: 16,
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  nom: { fontSize: 18, fontWeight: '800', color: theme.slate900 },
  meta: { fontSize: 14, color: theme.slate500, marginTop: 4 },
  desc: { fontSize: 14, color: theme.slate600, marginTop: 8, lineHeight: 20 },
  editBtn: {
    marginTop: 12,
    backgroundColor: theme.teal600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editBtnTxt: { color: theme.white, fontWeight: '800', fontSize: 16 },
  section: { fontSize: 13, fontWeight: '800', color: theme.slate500, marginBottom: 6 },
  linkText: { fontSize: 16, fontWeight: '700', color: theme.teal700 },
  danger: {
    marginTop: 24,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerTxt: { color: '#b91c1c', fontWeight: '800', fontSize: 16 },
});
