import {
  Bebas_Neue,
  IBM_Plex_Sans,
  Inter,
  Lora,
  Playfair_Display,
  Source_Sans_3,
} from 'next/font/google';

import type { DesignFont } from '@/lib/validations/design';

/**
 * Catálogo curado de tipografías del editor (RF-9). next/font las self-hostea
 * en build — cero requests a Google en runtime (RNF-9 + privacidad).
 * `preload: false`: los @font-face se emiten, pero el browser solo descarga
 * las familias que el tema seleccionado referencia vía font-family.
 */

const inter = Inter({ subsets: ['latin'], preload: false, display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], preload: false, display: 'swap' });
const lora = Lora({ subsets: ['latin'], preload: false, display: 'swap' });
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], preload: false, display: 'swap' });
const ibmPlex = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
});
const sourceSans = Source_Sans_3({ subsets: ['latin'], preload: false, display: 'swap' });

const FONT_FAMILIES: Record<DesignFont, string> = {
  inter: inter.style.fontFamily,
  playfair: playfair.style.fontFamily,
  lora: lora.style.fontFamily,
  bebas: bebas.style.fontFamily,
  'ibm-plex': ibmPlex.style.fontFamily,
  'source-sans': sourceSans.style.fontFamily,
};

/** font-family CSS del catálogo, para usar como CSS var en el wrapper del diseño. */
export function fontFamily(font: DesignFont): string {
  return FONT_FAMILIES[font];
}
