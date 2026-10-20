import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePaletteId =
  | 'forest'
  | 'indigo'
  | 'terracotta'
  | 'teal'
  | 'obsidian'
  | 'plum';

export interface ThemePaletteInfo {
  id: ThemePaletteId;
  name: string;
  tagline: string;
  vibe: string;
  primaryHex: string;
  accentHex: string;
  bgHex: string;
  cardHex: string;
  badgeHex: string;
  description: string;
}

export const DEFAULT_PALETTE_ID: ThemePaletteId = 'teal';

export const THEME_PALETTES: ThemePaletteInfo[] = [
  {
    id: 'teal',
    name: 'Caribbean Teal & Neo-Mint',
    tagline: 'Default • Fresh, energetic & digital',
    vibe: 'Revolut / N26 Neo-Bank Style',
    primaryHex: '#116A65',
    accentHex: '#D2F5F1',
    bgHex: '#F3F8F8',
    cardHex: '#FFFFFF',
    badgeHex: '#0D9488',
    description: 'Deep ocean teal paired with crisp mint mist. Fresh, trust-inspiring, and high-clarity financial tracking.',
  },
  {
    id: 'indigo',
    name: 'Royal Indigo & Iris',
    tagline: 'Modern, crisp & high-tech',
    vibe: 'Linear / Stripe SaaS Style',
    primaryHex: '#3730A3',
    accentHex: '#E0E4FF',
    bgHex: '#F4F6FA',
    cardHex: '#FFFFFF',
    badgeHex: '#4338CA',
    description: 'Vibrant royal indigo with cool porcelain slate backgrounds and electric iris accents. Ultra-sharp and modern.',
  },
  {
    id: 'forest',
    name: 'Nordic Forest & Sage',
    tagline: 'Calm, organic & natural',
    vibe: 'Eco Fintech / Notion Aesthetic',
    primaryHex: '#275940',
    accentHex: '#E2F0E5',
    bgHex: '#F7F6F2',
    cardHex: '#FFFFFF',
    badgeHex: '#1B4332',
    description: 'Deep evergreen pine with warm linen parchment and gentle sage accents. Relaxed and easy on the eyes.',
  },
  {
    id: 'terracotta',
    name: 'Tuscan Terracotta & Sand',
    tagline: 'Warm, cozy & artisanal',
    vibe: 'Splitwise Reimagined / Warm Hearth',
    primaryHex: '#AB4722',
    accentHex: '#FDE8DB',
    bgHex: '#FAF7F2',
    cardHex: '#FFFFFF',
    badgeHex: '#C05621',
    description: 'Earthy baked terracotta with soft desert sand and warm peach accents. Feels friendly, tactile, and welcoming.',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Slate & Cobalt',
    tagline: 'Minimalist, luxury & focused',
    vibe: 'Apple / Vercel Monochromatic',
    primaryHex: '#131C31',
    accentHex: '#E5EFFF',
    bgHex: '#F5F7FA',
    cardHex: '#FFFFFF',
    badgeHex: '#2563EB',
    description: 'Deep obsidian graphite with cool titanium tones and electric cobalt badges. High contrast, timeless, and punchy.',
  },
  {
    id: 'plum',
    name: 'Royal Plum & Champagne',
    tagline: 'Sophisticated, rich & creative',
    vibe: 'Boutique Lifestyle / Velvet Lounge',
    primaryHex: '#582585',
    accentHex: '#F1E3FB',
    bgHex: '#FAF6FB',
    cardHex: '#FFFFFF',
    badgeHex: '#7C3AED',
    description: 'Velvet royal plum with delicate champagne orchid highlights. Distinctive, luxurious, and visually captivating.',
  },
];

interface ThemeContextType {
  palette: ThemePaletteId;
  setPalette: (id: ThemePaletteId) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  toggleDark: () => void;
  currentPalette: ThemePaletteInfo;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_PALETTE_KEY = 'flatmate_theme_palette';
const STORAGE_DARK_KEY = 'flatmate_theme_dark';

function runThemeTransition(updateFn: () => void) {
  if (typeof document === 'undefined') {
    updateFn();
    return;
  }

  const root = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Modern browser GPU-accelerated View Transition API
  if (!prefersReduced && typeof (document as any).startViewTransition === 'function') {
    (document as any).startViewTransition(() => {
      updateFn();
    });
    return;
  }

  // Lightweight CSS transition fallback for 60fps mobile transitions
  if (!prefersReduced) {
    root.classList.add('theme-transitioning');
  }

  updateFn();

  if (!prefersReduced) {
    window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 180);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<ThemePaletteId>(() => {
    const saved = localStorage.getItem(STORAGE_PALETTE_KEY) as ThemePaletteId | null;
    return saved && THEME_PALETTES.some((p) => p.id === saved) ? saved : DEFAULT_PALETTE_ID;
  });

  const [isDark, setIsDarkState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_DARK_KEY);
    return saved ? saved === 'true' : false;
  });

  const setPalette = (id: ThemePaletteId) => {
    if (id === palette) return;
    runThemeTransition(() => {
      document.documentElement.setAttribute('data-theme', id);
      setPaletteState(id);
    });

    // Non-blocking persistent save to keep touch response instantaneous
    window.requestAnimationFrame(() => {
      try {
        localStorage.setItem(STORAGE_PALETTE_KEY, id);
      } catch (e) {
        console.error('Failed to save theme palette to localStorage', e);
      }
    });
  };

  const setIsDark = (dark: boolean) => {
    if (dark === isDark) return;
    runThemeTransition(() => {
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      setIsDarkState(dark);
    });

    // Non-blocking persistent save
    window.requestAnimationFrame(() => {
      try {
        localStorage.setItem(STORAGE_DARK_KEY, String(dark));
      } catch (e) {
        console.error('Failed to save theme dark mode to localStorage', e);
      }
    });
  };

  const toggleDark = () => setIsDark(!isDark);

  // Sync only on external/initial state changes without redundant double-mutation
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme !== palette) {
      document.documentElement.setAttribute('data-theme', palette);
    }
    const hasDarkClass = document.documentElement.classList.contains('dark');
    if (isDark !== hasDarkClass) {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [palette, isDark]);

  const currentPalette =
    THEME_PALETTES.find((p) => p.id === palette) || THEME_PALETTES[0];

  return (
    <ThemeContext.Provider
      value={{
        palette,
        setPalette,
        isDark,
        setIsDark,
        toggleDark,
        currentPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
