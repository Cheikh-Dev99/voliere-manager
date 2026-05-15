import type { User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { auth } from '@shared/firebase/authClient';
import { useUserProfile } from '@shared/hooks/useUserProfile';

import type { ShadowCardStyle, ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { UserProfileSheet } from '../profile/UserProfileSheet';
import { profileDisplayName, profileElevageLabel, profileInitials } from '../profile/profileUtils';

function createMenuHeaderStyles(theme: ThemeColors, shadowCard: ShadowCardStyle) {
  return StyleSheet.create({
    trigger: {
      marginRight: 0,
      maxWidth: 220,
      borderRadius: theme.radiusLg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      ...shadowCard,
    },
    triggerPressed: {
      backgroundColor: theme.teal50,
      borderColor: theme.teal600,
    },
    triggerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      paddingLeft: 8,
      paddingRight: 6,
      minHeight: theme.minTap,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.teal600,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.white,
    },
    avatarTxt: { color: theme.white, fontWeight: '800', fontSize: 12 },
    triggerTextCol: { flex: 1, minWidth: 0 },
    name: { fontSize: 13, fontWeight: '700', color: theme.slate900 },
    elevage: { fontSize: 11, fontWeight: '500', color: theme.slate500, marginTop: 1 },
    chevron: { opacity: 0.85 },
  });
}

export function UserMenuHeader() {
  const { colors: theme, shadowCard } = useAppTheme();
  const styles = useMemo(() => createMenuHeaderStyles(theme, shadowCard), [theme, shadowCard]);
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  const email = user?.email ?? '';
  const { profile, loading: profileLoading } = useUserProfile(email || undefined);

  const inn = profileInitials(profile, email);
  const nameLine = profileDisplayName(profile, email);
  const elevage = profileElevageLabel(profile);

  return (
    <>
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Profil : ${nameLine}, ${elevage}. Ouvrir le menu compte.`}
        accessibilityHint="Affiche statistiques, volières et déconnexion"
      >
        <View style={styles.triggerInner}>
          <View style={styles.avatar}>
            {profileLoading ? (
              <ActivityIndicator color={theme.white} size="small" />
            ) : (
              <Text style={styles.avatarTxt}>{inn}</Text>
            )}
          </View>
          <View style={styles.triggerTextCol}>
            <Text style={styles.name} numberOfLines={1}>
              {nameLine}
            </Text>
            <Text style={styles.elevage} numberOfLines={1}>
              {elevage}
            </Text>
          </View>
          <ChevronDown size={18} color={theme.slate500} style={styles.chevron} />
        </View>
      </Pressable>

      <UserProfileSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
