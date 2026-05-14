/**
 * GIF de chargement par rubrique — aligné sur `apps/web/src/components/loading/loadingGifAssets.js`.
 */
export type LoadingGifContext = 'cages' | 'couples' | 'reproduction' | 'sorties' | 'default';

export function getLoadingGifSource(ctx: LoadingGifContext | undefined): number {
  switch (ctx) {
    case 'cages':
      return require('../assets/loading/cage-a-oiseaux.gif');
    case 'couples':
      return require('../assets/loading/amoureux.gif');
    case 'reproduction':
      return require('../assets/loading/nid.gif');
    case 'sorties':
      return require('../assets/loading/liberte.gif');
    default:
      return require('../assets/loading/oiseau.gif');
  }
}
