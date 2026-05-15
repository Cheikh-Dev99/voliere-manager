export type { ThemeColors } from './palettes';
export { darkPalette, lightPalette, shadowCardFor } from './palettes';

import { lightPalette } from './palettes';
import { shadowCardFor } from './palettes';

/** @deprecated Utiliser `useAppTheme().colors` depuis `context/AppThemeContext`. */
export const theme = lightPalette;

/** @deprecated Utiliser `useAppTheme().shadowCard`. */
export const shadowCard = shadowCardFor(lightPalette, 'light');
