import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { HelpCircle } from 'lucide-react-native';

import type { Pigeon } from '@shared/types';
import { buildAncestorRows, generationLabel } from '@shared/utils/genealogyTree';

import { usePigeonDisplayPhoto } from '../../hooks/usePigeonDisplayPhoto';
import type { ShadowCardStyle, ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { useThemedStyles } from '../../lib/useThemedStyles';

const STATUT_DOT: Record<string, string> = {
  ACTIF: '#10b981',
  VENDU: '#94a3b8',
  MORT: '#71717a',
  PERDU: '#f59e0b',
};

function ConnectorDown({ s }: { s: ReturnType<typeof createTreeStyles> }) {
  return (
    <View style={s.connectorWrap} accessibilityElementsHidden>
      <View style={s.connectorLine} />
    </View>
  );
}

type MiniCardProps = {
  pigeonId: string;
  pigeonById: ReadonlyMap<string, Pigeon>;
  emphasis: boolean;
  onOpenPigeon: (id: string) => void;
};

function PigeonMiniCard({
  pigeonId,
  pigeonById,
  emphasis,
  onOpenPigeon,
  s,
}: MiniCardProps & { s: ReturnType<typeof createTreeStyles> }) {
  const { colors } = useAppTheme();
  const p = pigeonById.get(pigeonId);
  const photoUri = usePigeonDisplayPhoto(p ? { id: p.id, photo: p.photo } : null);
  const dotColor = p ? STATUT_DOT[p.statut] ?? '#cbd5e1' : '#cbd5e1';
  const isDeleted = Boolean(p?.deletedAt);

  if (!p) {
    return (
      <View style={[s.miniCard, s.miniCardMissing, emphasis && s.miniCardEmphasis]}>
        <HelpCircle size={20} color={colors.slate500} />
        <Text style={s.missingK}>Réf. absente</Text>
        <Text style={s.missingId} numberOfLines={1}>
          {pigeonId.slice(0, 8)}…
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onOpenPigeon(p.id)}
      style={({ pressed }) => [
        s.miniCard,
        emphasis ? s.miniCardSubject : s.miniCardPlain,
        pressed && s.miniCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Fiche ${p.matricule}`}
    >
      <View style={s.miniRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.miniThumb} accessibilityIgnoresInvertColors />
        ) : (
          <View style={s.miniThumbPh}>
            <Text style={s.miniThumbPhTxt}>—</Text>
          </View>
        )}
        <View style={s.miniBody}>
          <View style={s.miniHead}>
            <View style={[s.statDot, { backgroundColor: dotColor }]} />
            <Text
              style={[s.miniMat, p.sexe === 'MALE' ? s.miniMale : s.miniFem]}
              numberOfLines={1}
            >
              {p.sexe === 'MALE' ? '♂' : '♀'} {p.matricule}
            </Text>
          </View>
          <Text style={s.miniNom} numberOfLines={1}>
            {p.nom}
          </Text>
          {isDeleted ? <Text style={s.miniRetire}>Retiré de l’effectif</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export type GenealogyForRootProps = {
  rootId: string;
  pigeonById: ReadonlyMap<string, Pigeon>;
  maxGen?: number;
  onOpenPigeon: (id: string) => void;
};

export function GenealogyForRoot({ rootId, pigeonById, maxGen = 2, onOpenPigeon }: GenealogyForRootProps) {
  const s = useThemedStyles(createTreeStyles);
  const rows = useMemo(() => buildAncestorRows(rootId, pigeonById, maxGen), [rootId, pigeonById, maxGen]);
  const maxDepth = rows.length - 1;

  if (rows.length === 0) {
    return <Text style={s.emptyTree}>Aucune donnée.</Text>;
  }

  return (
    <View>
      {rows.map((ids, rowIdx) => {
        const depthFromSubject = maxDepth - rowIdx;
        const isSubjectRow = rowIdx === rows.length - 1;
        const label = generationLabel(depthFromSubject);

        return (
          <View key={`row-${rowIdx}`}>
            {rowIdx > 0 ? <ConnectorDown s={s} /> : null}
            <View style={[s.genBlock, isSubjectRow ? s.genBlockSubject : s.genBlockAnc]}>
              <View style={[s.genHeader, isSubjectRow && s.genHeaderSubject]}>
                <Text style={[s.genLabel, isSubjectRow && s.genLabelSubject]}>{label}</Text>
                {!isSubjectRow ? (
                  <Text style={s.genCount}>
                    {ids.length} pigeon{ids.length > 1 ? 's' : ''}
                  </Text>
                ) : null}
              </View>
              <View style={isSubjectRow ? s.genCardsSubjectOuter : undefined}>
                <View style={s.genCards}>
                  {ids.map((id) => (
                    <PigeonMiniCard
                      key={id}
                      pigeonId={id}
                      pigeonById={pigeonById}
                      emphasis={isSubjectRow}
                      onOpenPigeon={onOpenPigeon}
                      s={s}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function hasAnyParent(p: Pigeon | null | undefined): boolean {
  return Boolean(p?.pereId || p?.mereId);
}

export type PigeonSoloAncestorBlockProps = {
  pigeon: Pigeon;
  pigeonById: ReadonlyMap<string, Pigeon>;
  onOpenPigeon: (id: string) => void;
};

/** Intro + bandeau + arbre ascendant (même contenu que l’onglet cage / web). */
export function PigeonSoloAncestorBlock({ pigeon, pigeonById, onOpenPigeon }: PigeonSoloAncestorBlockProps) {
  const soloStyles = useThemedStyles(createSoloStyles);
  const hasTree = hasAnyParent(pigeon);
  return (
    <View style={soloStyles.wrap}>
      <Text style={soloStyles.intro}>
        Lignée ascendante (jusqu’à <Text style={soloStyles.introBold}>grands-parents</Text> lorsque les fiches sont
        renseignées). Touche une fiche pour ouvrir le détail pigeon.
      </Text>
      {!hasTree ? (
        <View style={soloStyles.warnBanner}>
          <Text style={soloStyles.warnBannerTxt}>
            Aucun père ni mère renseigné sur la fiche — complète la généalogie depuis la fiche pigeon pour enrichir
            l’arbre.
          </Text>
        </View>
      ) : null}
      <GenealogyForRoot rootId={pigeon.id} pigeonById={pigeonById} maxGen={2} onOpenPigeon={onOpenPigeon} />
    </View>
  );
}

function createSoloStyles(theme: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    intro: {
      fontSize: 12,
      lineHeight: 18,
      color: theme.slate600,
    },
    introBold: { fontWeight: '700', color: theme.slate800 },
    warnBanner: {
      borderRadius: theme.radiusMd,
      borderWidth: 1,
      borderColor: theme.amber950,
      backgroundColor: theme.amber50,
      padding: 10,
    },
    warnBannerTxt: { fontSize: 12, lineHeight: 17, color: theme.amber950 },
  });
}

function createTreeStyles(theme: ThemeColors, shadowCard: ShadowCardStyle) {
  return StyleSheet.create({
  connectorWrap: { alignItems: 'center', paddingVertical: 2 },
  connectorLine: { width: 2, height: 14, backgroundColor: '#cbd5e1', borderRadius: 1 },
  genBlock: {
    borderRadius: theme.radiusLg,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  genBlockAnc: { backgroundColor: theme.surfaceHighlight },
  genBlockSubject: {
    backgroundColor: theme.teal50,
    borderWidth: 1,
    borderColor: theme.teal100,
    ...shadowCard,
  },
  genHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  genHeaderSubject: {
    justifyContent: 'center',
  },
  genLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.slate500,
  },
  genLabelSubject: { color: theme.teal800 },
  genCount: { fontSize: 10, color: theme.slate500 },
  /** Centre le groupe de pastilles (surtout la ligne SUJET) dans le bloc teal / gris. */
  genCardsSubjectOuter: {
    width: '100%',
    alignItems: 'center',
  },
  genCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '100%',
  },
  miniCard: {
    minWidth: 120,
    maxWidth: 168,
    borderRadius: theme.radiusLg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  miniCardPlain: {
    borderColor: theme.border,
    backgroundColor: theme.surfaceElevated,
    ...shadowCard,
  },
  miniCardSubject: {
    borderColor: theme.teal600,
    backgroundColor: theme.surfaceElevated,
    borderWidth: 2,
    ...shadowCard,
  },
  miniCardMissing: {
    borderStyle: 'dashed',
    borderColor: theme.slate200,
    backgroundColor: theme.surfaceHighlight,
    alignItems: 'center',
  },
  miniCardEmphasis: {
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  miniCardPressed: { opacity: 0.88 },
  miniRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  miniThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: theme.slate100 },
  miniThumbPh: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniThumbPhTxt: { fontSize: 9, color: theme.slate500 },
  miniBody: { flex: 1, minWidth: 0 },
  miniHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  miniMat: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  miniMale: { color: '#075985' },
  miniFem: { color: '#9f1239' },
  miniNom: { fontSize: 10, lineHeight: 14, color: theme.slate600, marginTop: 2 },
  miniRetire: { marginTop: 4, fontSize: 9, fontWeight: '600', color: '#b45309' },
  missingK: { marginTop: 6, fontSize: 10, fontWeight: '600', color: theme.slate500 },
  missingId: { marginTop: 2, fontSize: 9, color: theme.slate500 },
  emptyTree: { textAlign: 'center', fontSize: 14, color: theme.slate500, paddingVertical: 12 },
  });
}
