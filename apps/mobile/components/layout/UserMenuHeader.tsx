import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { auth } from '@shared/firebase/authClient';
import { logout } from '@shared/firebase/auth';

import { theme } from '../../constants/theme';

function initials(u: User | null): string {
  if (!u) return '?';
  const dn = u.displayName?.trim();
  if (dn) {
    const parts = dn.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return dn.slice(0, 2).toUpperCase();
  }
  return (u.email?.split('@')[0] ?? '?').slice(0, 2).toUpperCase();
}

export function UserMenuHeader() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  const openMenu = () => {
    Alert.alert(user?.email ?? 'Compte', 'Ma volière — Volière Manager', [
      { text: 'Fermer', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Déconnexion', 'Quitter la session ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnexion', style: 'destructive', onPress: () => void logout() },
          ]);
        },
      },
    ]);
  };

  return (
    <Pressable
      onPress={openMenu}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Menu compte"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{initials(user)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: 12, padding: 4 },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.teal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: theme.white, fontWeight: '800', fontSize: 13 },
});
