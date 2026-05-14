import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../constants/theme';

type PageHeaderProps = {
  /** Omis quand le titre est dans la barre native (Tabs). */
  title?: string;
  /** Texte d’aide sous le titre (style web). */
  description?: string;
  /** Icône à gauche du titre (inutile si `title` est omis). */
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
  const showTitleRow = Boolean(title?.trim()) || titleAccessory != null;

  return (
    <View style={styles.wrap}>
      {showTitleRow ? (
        <View style={styles.titleRow}>
          {titleAccessory}
          {title?.trim() ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}
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
