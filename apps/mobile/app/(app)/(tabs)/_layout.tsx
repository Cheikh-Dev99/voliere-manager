import { Tabs } from 'expo-router';
import {
  Bird,
  ClipboardList,
  Egg,
  Heart,
  LayoutGrid,
  ListTree,
  PanelsTopLeft,
} from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { UserMenuHeader } from '../../../components/layout/UserMenuHeader';
import { theme } from '../../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.white },
        headerShadowVisible: true,
        headerTintColor: theme.teal700,
        headerTitleStyle: { fontWeight: '700', color: theme.slate900, fontSize: 17 },
        headerRight: () => <UserMenuHeader />,
        tabBarActiveTintColor: theme.teal700,
        tabBarInactiveTintColor: theme.slate500,
        tabBarStyle: {
          backgroundColor: theme.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.slate200,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Visualisation',
          tabBarLabel: 'Volière',
          tabBarIcon: ({ color, size }) => <PanelsTopLeft color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="cages"
        options={{
          title: 'Cages',
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="pigeons"
        options={{
          title: 'Pigeons',
          tabBarIcon: ({ color, size }) => <Bird color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="couples"
        options={{
          title: 'Couples',
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="reproductions"
        options={{
          title: 'Reproductions',
          tabBarLabel: 'Repro.',
          tabBarIcon: ({ color, size }) => <Egg color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="sorties"
        options={{
          title: 'Sorties',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="mobile-nav"
        options={{
          title: 'Navigation',
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => <ListTree color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
