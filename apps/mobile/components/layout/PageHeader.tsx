import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../constants/theme';

type PageHeaderProps = {
  title: string;
  /** Texte d’aide sous le titre (style web). */
  description?: string;
  /** Titre avec icône à gauche (ex. maison + Volière A). */
  titleAccessory?: ReactNode;
  /** Bouton pleine largeur ou ligne d’actions sous la description. */
  children?: ReactNode;
};

export function PageHeader({
  title,
  description,
  titleAccessory,
  children,
}: PageHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        {titleAccessory}
        <Text style={styles.title}>{title}</Text>
      </View>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.slate900,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  desc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.slate600,
  },
  actions: { marginTop: 14, gap: 10 },
});
