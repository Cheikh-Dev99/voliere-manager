import { Tabs, usePathname, useSegments } from 'expo-router';
import { Bird, ClipboardList, Egg, Heart, LayoutGrid, LayoutTemplate } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { SiteBackgroundDecor } from '../../../components/layout/SiteBackgroundDecor';
import { UserMenuHeader } from '../../../components/layout/UserMenuHeader';
import { theme } from '../../../constants/theme';

/** Filigrane uniquement sur ces 6 onglets (Volière…Sorties). Pas sur mobile-nav ni ailleurs — l’auth a son propre décor dans `login.tsx`. */
const MAIN_TAB_SEGMENTS = new Set(['index', 'cages', 'pigeons', 'couples', 'reproductions', 'sorties']);

export default function TabsLayout() {
  const segments = useSegments();
  const pathname = (usePathname() ?? '/').replace(/\/$/, '') || '/';
  const leaf = segments[segments.length - 1] ?? '';
  /** Expo Router retire `index` des segments ; sur l’onglet Volière le dernier segment devient `(tabs)` alors que le `pathname` vaut `/`. */
  const showFiligree =
    MAIN_TAB_SEGMENTS.has(leaf) ||
    segments.some((s) => MAIN_TAB_SEGMENTS.has(s)) ||
    pathname === '/';

  return (
    <View style={styles.tabsShell}>
      {showFiligree ? <SiteBackgroundDecor /> : null}
      <Tabs
      initialRouteName="cages"
      screenOptions={{
        sceneStyle: { backgroundColor: 'transparent' },
        headerShown: true,
        headerStyle: { backgroundColor: theme.white },
        headerShadowVisible: true,
        headerTintColor: theme.teal700,
        headerTitleStyle: { fontWeight: '700', color: theme.slate900, fontSize: 17 },
        headerRight: () => <UserMenuHeader />,
        tabBarActiveTintColor: theme.teal700,
        tabBarInactiveTintColor: theme.slate500,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: theme.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.slate200,
          /** Hauteur confortable : icône + libellé + descenders (g, p…) sans rogner. */
          minHeight: 82,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarItemStyle: { flex: 1, minWidth: 0, paddingVertical: 4 },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
          marginBottom: 4,
          lineHeight: 13,
        },
        tabBarIconStyle: { marginTop: 0, marginBottom: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Visualisation',
          tabBarLabel: 'Volière',
          tabBarIcon: ({ color, size }) => <LayoutTemplate color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="cages"
        options={{
          title: 'Cages',
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="pigeons"
        options={{
          title: 'Pigeons',
          tabBarIcon: ({ color, size }) => <Bird color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="couples"
        options={{
          title: 'Couples',
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="reproductions"
        options={{
          title: 'Reproductions',
          tabBarLabel: 'Repro.',
          tabBarIcon: ({ color, size }) => <Egg color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="sorties"
        options={{
          title: 'Sorties',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="mobile-nav"
        options={{
          title: 'Navigation',
          href: null,
        }}
      />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsShell: {
    flex: 1,
    position: 'relative',
    backgroundColor: theme.slate100,
  },
});
