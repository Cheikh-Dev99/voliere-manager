import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';
import {
  Bird,
  Heart,
  LayoutGrid,
  ListTree,
  LogOut,
  MapPinned,
  PanelsTopLeft,
  PencilLine,
  Save,
  UserRound,
  X,
} from 'lucide-react-native';

import { auth } from '@shared/firebase/authClient';
import { logout } from '@shared/firebase/auth';
import { useCages } from '@shared/hooks/useCages';
import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { mergeProfileVoliereCodesWithCages } from '@shared/utils/voliereCodesMerge';
import { updateUserProfile } from '@shared/services/usersProfileService';

import { appFeedback } from '../../lib/appFeedback';
import type { ShadowCardStyle, ThemeColors } from '../../constants/palettes';
import { useAppTheme, useThemeColors } from '../../context/AppThemeContext';
import { ThemeAppearanceControl } from '../settings/ThemeAppearanceControl';
import { VoliereCodesForm } from './VoliereCodesForm';
import { profileDisplayName, profileElevageLabel, profileInitials } from './profileUtils';

type Tone = 'slate' | 'teal' | 'rose';

type StatTileProps = {
  label: string;
  value: string;
  tone: Tone;
  icon: ReactNode;
};

function StatTile({ label, value, tone, icon }: StatTileProps) {
  const theme = useThemeColors();
  const tileStyles = useMemo(
    () =>
      StyleSheet.create({
        statTile: {
          flexBasis: '48%',
          flexGrow: 1,
          borderWidth: 1,
          borderRadius: theme.radiusLg,
          paddingHorizontal: 12,
          paddingVertical: 12,
          minHeight: 88,
        },
        statTileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        statLabel: { flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
        statValue: { marginTop: 8, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
      }),
    [theme.radiusLg],
  );

  const bg =
    tone === 'teal' ? 'rgba(204, 251, 241, 0.55)' : tone === 'rose' ? theme.rose50 : theme.slate50;
  const border = tone === 'teal' ? theme.teal100 : tone === 'rose' ? '#fecdd3' : theme.slate200;
  const labelColor = tone === 'teal' ? theme.teal700 : tone === 'rose' ? '#be123c' : theme.slate600;
  const numColor = tone === 'teal' ? theme.teal800 : tone === 'rose' ? '#9f1239' : theme.slate900;

  return (
    <View style={[tileStyles.statTile, { backgroundColor: bg, borderColor: border }]}>
      <View style={tileStyles.statTileHead}>
        {icon}
        <Text style={[tileStyles.statLabel, { color: labelColor }]} numberOfLines={2}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text style={[tileStyles.statValue, { color: numColor }]} accessibilityLabel={`${label} ${value}`}>
        {value}
      </Text>
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function UserProfileSheet({ visible, onClose }: Props) {
  const { colors: theme, shadowCard: sheetShadow } = useAppTheme();
  const styles = useMemo(() => createUserProfileStyles(theme, sheetShadow), [theme, sheetShadow]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(() => auth.currentUser);

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  const email = user?.email ?? '';
  const uid = user?.uid ?? '';

  const { profile, loading: profileLoading } = useUserProfile(email || undefined);
  const { pigeons, loading: lp } = usePigeons(false);
  const { cages, loading: lc } = useCages();
  const { couples, loading: lco } = useCouples(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [draftPrenom, setDraftPrenom] = useState('');
  const [draftNom, setDraftNom] = useState('');
  const [draftElevage, setDraftElevage] = useState('');
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const couplesActifs = couples.length;
  const nbVolieres = useMemo(
    () => mergeProfileVoliereCodesWithCages(profile?.voliereCodes, cages).length,
    [profile?.voliereCodes, cages],
  );

  const statsLoading = lp || lc || lco;

  useEffect(() => {
    if (!profile) return;
    setDraftPrenom(profile.prenom ?? '');
    setDraftNom(profile.nom ?? '');
    setDraftElevage(profile.nomElevage ?? '');
  }, [profile]);

  useEffect(() => {
    if (!visible) {
      setEditing(false);
      setSaveBanner(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!saveBanner) return;
    const t = setTimeout(() => setSaveBanner(null), 3500);
    return () => clearTimeout(t);
  }, [saveBanner]);

  const inn = profileInitials(profile, email);
  const nameLine = profileDisplayName(profile, email);
  const elevage = profileElevageLabel(profile);

  const handleSaveProfile = useCallback(async () => {
    if (!uid) return;
    setSaving(true);
    setSaveBanner(null);
    try {
      await updateUserProfile(uid, {
        prenom: draftPrenom.trim(),
        nom: draftNom.trim(),
        nomElevage: draftElevage.trim() || 'Ma volière',
      });
      setEditing(false);
      setSaveBanner('Profil enregistré.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Enregistrement impossible';
      appFeedback.alert('Erreur', msg);
    } finally {
      setSaving(false);
    }
  }, [uid, draftPrenom, draftNom, draftElevage]);

  const confirmLogout = useCallback(() => {
    appFeedback.alert('Déconnexion', 'Quitter la session sur cet appareil ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSigningOut(true);
            try {
              onClose();
              await logout();
            } finally {
              setSigningOut(false);
            }
          })();
        },
      },
    ]);
  }, [onClose]);

  const goGrilleVoliere = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      router.push('/(app)/(tabs)/');
    });
  }, [onClose, router]);

  const goNavigationMenu = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      router.push('/(app)/(tabs)/mobile-nav');
    });
  }, [onClose, router]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View style={[styles.chrome, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topBar}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Fermer le profil"
              hitSlop={12}
            >
              <X size={22} color={theme.slate700} />
            </Pressable>
            <Text style={styles.topTitle}>Mon profil</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
          >
            <View style={styles.hero}>
              <View style={styles.heroInner}>
                <View style={styles.heroAvatar}>
                  {profileLoading ? (
                    <ActivityIndicator color={theme.white} />
                  ) : (
                    <Text style={styles.heroAvatarTxt}>{inn}</Text>
                  )}
                </View>
                <View style={styles.heroTextCol}>
                  <Text style={styles.heroName} numberOfLines={2}>
                    {nameLine}
                  </Text>
                  <Text style={styles.heroElevage} numberOfLines={1}>
                    {elevage}
                  </Text>
                  <Text style={styles.heroEmail} numberOfLines={1}>
                    {email || '—'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionKicker, { marginTop: 6 }]}>ACCÈS RAPIDES</Text>
            <View style={styles.quickNav}>
              <Pressable
                onPress={goGrilleVoliere}
                style={({ pressed }) => [styles.quickRow, pressed && styles.quickRowPressed]}
                accessibilityRole="button"
                accessibilityLabel="Grille des cages par volière"
              >
                <PanelsTopLeft size={22} color={theme.teal700} strokeWidth={2.2} />
                <View style={styles.quickTextCol}>
                  <Text style={styles.quickTitle}>Grille volière</Text>
                  <Text style={styles.quickSub}>Vue par bâtiment, comme sur le web</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={goNavigationMenu}
                style={({ pressed }) => [styles.quickRow, pressed && styles.quickRowPressed]}
                accessibilityRole="button"
                accessibilityLabel="Navigation et créations rapides"
              >
                <ListTree size={22} color={theme.teal700} strokeWidth={2.2} />
                <View style={styles.quickTextCol}>
                  <Text style={styles.quickTitle}>Navigation</Text>
                  <Text style={styles.quickSub}>Rubriques et formulaires de création</Text>
                </View>
              </Pressable>
            </View>

            <Text style={styles.sectionKicker}>MON ÉLEVAGE</Text>
            <View style={styles.statsGrid}>
              <StatTile
                label="Pigeons"
                value={statsLoading ? '…' : String(pigeons.length)}
                tone="slate"
                icon={<Bird size={16} color={theme.slate600} />}
              />
              <StatTile
                label="Cages"
                value={statsLoading ? '…' : String(cages.length)}
                tone="slate"
                icon={<LayoutGrid size={16} color={theme.slate600} />}
              />
              <StatTile
                label="Volières"
                value={statsLoading ? '…' : String(nbVolieres)}
                tone="teal"
                icon={<MapPinned size={16} color={theme.teal600} />}
              />
              <StatTile
                label="Couples actifs"
                value={statsLoading ? '…' : String(couplesActifs)}
                tone="rose"
                icon={<Heart size={16} color="#e11d48" />}
              />
            </View>

            <Text style={[styles.sectionKicker, styles.sectionKickerSpaced]}>MES VOLIÈRES</Text>
            <Text style={styles.intro}>
              Une <Text style={styles.introStrong}>volière</Text> est un bâtiment ou une zone ; tu lui donnes un{' '}
              <Text style={styles.introStrong}>nom court</Text> (ex. A, B, Nord) pour classer tes cages et te repérer
              dans les listes, même avant d’y mettre des cages.
            </Text>

            {uid ? <VoliereCodesForm uid={uid} profile={profile} cages={cages} /> : null}

            <View style={styles.divider} />

            {saveBanner ? (
              <Text style={styles.saveBanner} accessibilityLiveRegion="polite">
                {saveBanner}
              </Text>
            ) : null}

            {!editing ? (
              <Pressable
                onPress={() => setEditing(true)}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Modifier mes informations"
              >
                <PencilLine size={20} color={theme.teal700} />
                <Text style={styles.secondaryBtnText}>Modifier mes informations</Text>
              </Pressable>
            ) : (
              <View style={styles.editBlock}>
                <Text style={[styles.fieldLbl, styles.fieldLblFirst]}>Prénom</Text>
                <View style={styles.inputIconRow}>
                  <UserRound size={18} color={theme.slate500} style={styles.inputIcon} />
                  <TextInput
                    value={draftPrenom}
                    onChangeText={setDraftPrenom}
                    autoComplete="name-given"
                    style={styles.textIn}
                    placeholderTextColor={theme.slate500}
                  />
                </View>
                <Text style={styles.fieldLbl}>Nom</Text>
                <TextInput
                  value={draftNom}
                  onChangeText={setDraftNom}
                  autoComplete="name-family"
                  style={styles.textInPlain}
                  placeholderTextColor={theme.slate500}
                />
                <Text style={styles.fieldLbl}>Nom de la volière / élevage</Text>
                <TextInput
                  value={draftElevage}
                  onChangeText={setDraftElevage}
                  placeholder="Ex. Volière Grand Yoff"
                  placeholderTextColor={theme.slate500}
                  style={styles.textInPlain}
                />
                <View style={styles.editActions}>
                  <Pressable
                    onPress={() => void handleSaveProfile()}
                    disabled={saving}
                    style={({ pressed }) => [styles.primarySm, pressed && !saving && styles.primarySmPressed, saving && styles.opacityDim]}
                  >
                    {saving ? <ActivityIndicator color={theme.white} size="small" /> : <Save size={18} color={theme.white} />}
                    <Text style={styles.primarySmTxt}>Enregistrer</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditing(false);
                      if (profile) {
                        setDraftPrenom(profile.prenom ?? '');
                        setDraftNom(profile.nom ?? '');
                        setDraftElevage(profile.nomElevage ?? '');
                      }
                    }}
                    style={({ pressed }) => [styles.ghostSm, pressed && styles.ghostSmPressed]}
                  >
                    <X size={18} color={theme.slate700} />
                    <Text style={styles.ghostSmTxt}>Annuler</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.divider} />
            <ThemeAppearanceControl />

            <Pressable
              onPress={confirmLogout}
              disabled={signingOut}
              style={({ pressed }) => [styles.logoutBtn, pressed && !signingOut && styles.logoutBtnPressed, signingOut && styles.opacityDim]}
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
            >
              <LogOut size={20} color="#991b1b" />
              <Text style={styles.logoutTxt}>{signingOut ? 'Déconnexion…' : 'Se déconnecter'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createUserProfileStyles(theme: ThemeColors, shadowCard: ShadowCardStyle) {
  return StyleSheet.create({
  flex: { flex: 1 },
  chrome: {
    flex: 1,
    backgroundColor: theme.surfaceElevated,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.screenPadding - 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.slate200,
  },
  closeBtn: {
    width: theme.minTap,
    height: theme.minTap,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radiusMd,
  },
  closeBtnPressed: { backgroundColor: theme.slate100 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.slate900 },
  topBarSpacer: { width: theme.minTap },
  scrollContent: {
    paddingHorizontal: theme.screenPadding,
    paddingTop: 16,
  },
  hero: {
    borderRadius: theme.radiusLg,
    overflow: 'hidden',
    marginBottom: 20,
    ...shadowCard,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    backgroundColor: theme.teal700,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: theme.radiusLg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroAvatarTxt: { fontSize: 22, fontWeight: '800', color: theme.white },
  heroTextCol: { flex: 1, minWidth: 0 },
  heroName: { fontSize: 18, fontWeight: '700', color: theme.white, lineHeight: 24 },
  heroElevage: { marginTop: 4, fontSize: 15, color: 'rgba(255,255,255,0.92)' },
  heroEmail: { marginTop: 8, fontSize: 12, color: 'rgba(204, 251, 241, 0.95)' },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: theme.slate500,
    marginBottom: 10,
  },
  sectionKickerSpaced: { marginTop: 8 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  intro: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.slate600,
    marginBottom: 14,
  },
  introStrong: { fontWeight: '700', color: theme.slate800 },
  divider: {
    height: 1,
    backgroundColor: theme.slate100,
    marginVertical: 22,
  },
  saveBanner: {
    fontSize: 14,
    color: theme.emerald900,
    marginBottom: 12,
    fontWeight: '600',
  },
  secondaryBtn: {
    minHeight: theme.minTap + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.slate200,
    backgroundColor: theme.slate50,
    marginBottom: 14,
  },
  secondaryBtnPressed: { backgroundColor: theme.slate100 },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: theme.slate800 },
  editBlock: { marginBottom: 8 },
  fieldLbl: { fontSize: 12, fontWeight: '600', color: theme.slate600, marginBottom: 6, marginTop: 12 },
  fieldLblFirst: { marginTop: 0 },
  inputIconRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: { position: 'absolute', left: 12, zIndex: 1 },
  textIn: {
    flex: 1,
    minHeight: theme.minTap,
    borderWidth: 1,
    borderColor: theme.slate200,
    borderRadius: theme.radiusMd,
    paddingLeft: 40,
    paddingRight: 12,
    fontSize: 16,
    color: theme.slate900,
    backgroundColor: theme.surfaceElevated,
  },
  textInPlain: {
    minHeight: theme.minTap,
    borderWidth: 1,
    borderColor: theme.slate200,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    fontSize: 16,
    color: theme.slate900,
    backgroundColor: theme.surfaceElevated,
  },
  editActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  primarySm: {
    flex: 1,
    minWidth: 120,
    minHeight: theme.minTap,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.teal600,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primarySmPressed: { backgroundColor: theme.teal700 },
  primarySmTxt: { fontSize: 15, fontWeight: '700', color: theme.white },
  ghostSm: {
    flex: 1,
    minWidth: 120,
    minHeight: theme.minTap,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.slate200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.surfaceElevated,
  },
  ghostSmPressed: { backgroundColor: theme.slate50 },
  ghostSmTxt: { fontSize: 15, fontWeight: '600', color: theme.slate700 },
  logoutBtn: {
    marginTop: 20,
    minHeight: theme.minTap + 4,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutBtnPressed: { backgroundColor: '#ffe4e6' },
  logoutTxt: { fontSize: 16, fontWeight: '700', color: '#991b1b' },
  opacityDim: { opacity: 0.6 },
  quickNav: { gap: 10, marginBottom: 4 },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceElevated,
  },
  quickRowPressed: { backgroundColor: theme.teal50 },
  quickTextCol: { flex: 1, minWidth: 0 },
  quickTitle: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
  quickSub: { fontSize: 13, color: theme.slate600, marginTop: 3, lineHeight: 18 },
  });
}
