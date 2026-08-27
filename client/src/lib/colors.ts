/**
 * Highlight palette and contrast maths (plan §8.8).
 *
 * The user picks the highlight colour, so nothing about the foreground can be
 * hardcoded — it is computed per colour to hold WCAG AA.
 */

export interface PaletteColor {
  name: string;
  value: string;
}

/**
 * Eight curated highlight colours, pre-checked for legibility against both
 * themes. Offering these first (with a custom picker as an escape hatch) means
 * the app looks deliberate on first run rather than depending on taste.
 */
export const HIGHLIGHT_COLORS: readonly PaletteColor[] = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
] as const;

export const DEFAULT_HIGHLIGHT = HIGHLIGHT_COLORS[5]!.value; // blue

const clamp = (n: number, min = 0, max = 255): number => Math.min(max, Math.max(min, n));

export const hexToRgb = (hex: string): [number, number, number] => {
  const normalised = hex.replace('#', '').trim();
  const full =
    normalised.length === 3
      ? normalised
          .split('')
          .map((c) => c + c)
          .join('')
      : normalised.padEnd(6, '0').slice(0, 6);

  return [
    Number.parseInt(full.slice(0, 2), 16) || 0,
    Number.parseInt(full.slice(2, 4), 16) || 0,
    Number.parseInt(full.slice(4, 6), 16) || 0,
  ];
};

const toHex = (rgb: [number, number, number]): string =>
  `#${rgb.map((c) => clamp(Math.round(c)).toString(16).padStart(2, '0')).join('')}`;

/** WCAG relative luminance. */
export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
};

const NEAR_BLACK = '#111827';
const NEAR_WHITE = '#ffffff';

/**
 * Picks whichever of near-black / near-white reads better on the given
 * background. Chosen by measured contrast rather than a luminance threshold, so
 * it stays correct for unusual custom colours.
 */
export const readableForeground = (background: string): string =>
  contrastRatio(background, NEAR_BLACK) >= contrastRatio(background, NEAR_WHITE)
    ? NEAR_BLACK
    : NEAR_WHITE;

/** Mixes a colour toward black (`amount` < 0) or white (`amount` > 0). */
export const shade = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const ratio = Math.abs(amount);
  return toHex(rgb.map((c) => c + (target - c) * ratio) as [number, number, number]);
};

/**
 * The underline every highlight carries in addition to its background.
 *
 * This is the accessibility guarantee: colour alone cannot distinguish one rule
 * from another for a colour-blind reader, so each highlight also gets a darker
 * rule-coloured underline, and the tooltip names the rule outright.
 */
export const highlightBorder = (background: string): string => shade(background, -0.35);

/** Soft background tint of a rule colour, for chips and cards. */
export const tint = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
};
