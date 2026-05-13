import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bird,
  ClipboardList,
  Egg,
  Heart,
  LayoutGrid,
  ListTree,
  PanelsTopLeft,
  Plus,
} from 'lucide-react-native';

import { useMergedVoliereCodes } from '../../hooks/useMergedVoliereCodes';

import { theme } from '../../constants/theme';

type NavItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
};

/**
 * Navigation mobile alignée sur le header web (`AppLayout`) :
 * les six rubriques + raccourcis vers tous les formulaires de création.
 */
export function MobileNav() {
  const router = useRouter();
  const mergedCodes = useMergedVoliereCodes();
  const defaultVoliere = mergedCodes[0] ?? 'A';

  const goTab = (segment: 'index' | 'cages' | 'pigeons' | 'couples' | 'reproductions' | 'sorties') => {
    if (segment === 'index') {
      router.push('/(app)/(tabs)');
      return;
    }
    router.push(`/(app)/(tabs)/${segment}`);
  };

  const principales: NavItem[] = [
    {
      key: 'viz',
      title: 'Visualisation',
      subtitle: 'Grille des cages par volière (comme l’accueil web)',
      icon: <PanelsTopLeft size={22} color={theme.teal700} strokeWidth={2.2} />,
      onPress: () => goTab('index'),
    },
    {
      key: 'cages',
      title: 'Cages',
      subtitle: 'Liste, fiche, libération',
      icon: <LayoutGrid size={22} color={theme.teal700} strokeWidth={2.2} />,
      onPress: () => goTab('cages'),
    },
    {
      key: 'pigeons',
      title: 'Pigeons',
      subtitle: 'Liste et accès fiche / santé / généalogie',
      icon: <Bird size={22} color={theme.teal700} strokeWidth={2.2} />,
      onPress: () => goTab('pigeons'),
    },
    {
      key: 'couples',
      title: 'Couples',
      subtitle: 'Couples actifs ou rompus',
      icon: <Heart size={22} color={theme.teal700} strokeWidth={2.2} />,
      onPress: () => goTab('couples'),
    },
    {
      key: 'repro',
      title: 'Reproductions',
      subtitle: 'Portées enregistrées',
      icon: <Egg size={22} color={theme.teal700} strokeWidth={2.2} />,
      onPress: () => goTab('reproductions'),
    },
    {
      key: 'sorties',
      title: 'Sorties',
      subtitle: 'Ventes, décès, pertes',
      icon: <ClipboardList size={22} color={theme.teal700} strokeWidth={2.2} />,
      onPress: () => goTab('sorties'),
    },
  ];

  const creations: NavItem[] = [
    {
      key: 'ncage',
      title: 'Nouvelle cage',
      subtitle: 'Une cage ou lot (même logique que le site)',
      icon: <Plus size={22} color={theme.teal700} strokeWidth={2.5} />,
      onPress: () =>
        router.push({ pathname: '/(app)/cage/nouveau', params: { voliere: defaultVoliere } }),
    },
    {
      key: 'npigeon',
      title: 'Nouveau pigeon',
      subtitle: 'Fiche complète, matricule auto',
      icon: <Plus size={22} color={theme.teal700} strokeWidth={2.5} />,
      onPress: () => router.push('/(app)/pigeon/nouveau'),
    },
    {
      key: 'ncouple',
      title: 'Nouveau couple',
      subtitle: 'Mâle + femelle + cage optionnelle',
      icon: <Plus size={22} color={theme.teal700} strokeWidth={2.5} />,
      onPress: () => router.push('/(app)/couple/nouveau'),
    },
    {
      key: 'nrep',
      title: 'Nouvelle reproduction',
      subtitle: 'Couple actif, dates, œufs, jeunes',
      icon: <Plus size={22} color={theme.teal700} strokeWidth={2.5} />,
      onPress: () => router.push('/(app)/reproduction/nouveau'),
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <ListTree size={28} color={theme.teal700} strokeWidth={2.2} />
        <Text style={styles.heroTitle}>Navigation</Text>
        <Text style={styles.heroSub}>
          Même périmètre que le menu du site : les six rubriques principales, plus les écrans de création accessibles
          directement ici.
        </Text>
      </View>

      <Text style={styles.section}>Rubriques (comme le site)</Text>
      {principales.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
        >
          <View style={styles.rowIcon}>{item.icon}</View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSub}>{item.subtitle}</Text>
          </View>
        </Pressable>
      ))}

      <Text style={[styles.section, { marginTop: 22 }]}>Créations rapides</Text>
      {creations.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
        >
          <View style={styles.rowIcon}>{item.icon}</View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSub}>{item.subtitle}</Text>
          </View>
        </Pressable>
      ))}

      <View style={styles.note}>
        <Text style={styles.noteTit}>Fiche pigeon (santé, généalogie, modifier)</Text>
        <Text style={styles.noteBody}>
          Ouvre l’onglet Pigeons, choisis un pigeon : depuis la fiche tu accèdes aux mêmes sous-pages que sur le web
          (santé, généalogie, modifier).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: theme.screenPadding, paddingBottom: 40 },
  hero: {
    marginBottom: 20,
    padding: 16,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: theme.slate900 },
  heroSub: { fontSize: 14, color: theme.slate600, lineHeight: 20, marginTop: 4 },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  rowPressed: { opacity: 0.92, backgroundColor: theme.teal50 },
  rowIcon: { marginRight: 12 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
  rowSub: { fontSize: 13, color: theme.slate600, marginTop: 3, lineHeight: 18 },
  note: {
    marginTop: 24,
    padding: 14,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.slate100,
    borderWidth: 1,
    borderColor: theme.border,
  },
  noteTit: { fontSize: 14, fontWeight: '800', color: theme.slate800 },
  noteBody: { fontSize: 13, color: theme.slate600, marginTop: 6, lineHeight: 19 },
});
