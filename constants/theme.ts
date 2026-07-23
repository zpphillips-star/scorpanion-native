/**
 * Scorpanion design tokens — matches scorpanion.com globals.css
 */

// ── Backgrounds ───────────────────────────────────────────────────────────────
export const BG       = '#0c1b31';   // page background
export const SURFACE  = '#142236';   // card surface
export const SURFACE2 = '#1a2d4a';   // elevated card
export const SURFACE3 = '#213858';   // header / tab bar

// ── Borders ───────────────────────────────────────────────────────────────────
export const BORDER   = '#1e3050';
export const BORDER_D = '#25405c';

// ── Accent — Burnt Athletic Orange ───────────────────────────────────────────
export const ACCENT   = '#D95C17';
export const ACCENT_D = '#B54E13';

// ── Text — Vintage Cream ─────────────────────────────────────────────────────
export const TEXT         = '#F2E6CF';
export const TEXT_MUTED   = '#D8C6AA';
export const TEXT_FAINT   = '#5F6773';

// ── Status ────────────────────────────────────────────────────────────────────
export const LIVE     = '#FFB400';
export const WIN      = '#2FA84F';
export const LOSS     = '#C43D35';
export const FINAL    = '#5F6773';

// ── Legacy Colors export (keeps any code using Colors.dark.* working) ─────────
export const Colors = {
  light: {
    text:            '#11181C',
    background:      '#fff',
    tint:            ACCENT,
    icon:            '#687076',
    tabIconDefault:  '#687076',
    tabIconSelected: ACCENT,
  },
  dark: {
    text:            TEXT,
    background:      BG,
    tint:            ACCENT,
    icon:            TEXT_FAINT,
    tabIconDefault:  TEXT_FAINT,
    tabIconSelected: ACCENT,
  },
};
