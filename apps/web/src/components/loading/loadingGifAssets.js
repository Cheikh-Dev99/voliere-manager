import cageGif from '../../assets/cage-a-oiseaux.gif'
import couplesGif from '../../assets/amoureux.gif'
import reproductionGif from '../../assets/nid.gif'
import sortiesGif from '../../assets/liberte.gif'
import defaultGif from '../../assets/oiseau.gif'

/**
 * @typedef {'cages' | 'couples' | 'reproduction' | 'sorties' | 'default'} LoadingGifContext
 */

/** @param {LoadingGifContext | undefined} ctx */
export function getLoadingGifSrc(ctx) {
  switch (ctx) {
    case 'cages':
      return cageGif
    case 'couples':
      return couplesGif
    case 'reproduction':
      return reproductionGif
    case 'sorties':
      return sortiesGif
    default:
      return defaultGif
  }
}
