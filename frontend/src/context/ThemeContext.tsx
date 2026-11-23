import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePaletteId =
  | 'teal'
  | 'forest'
  | 'obsidian'
  | 'amber'
  | 'terracotta'
  | 'slate';

export interface ThemePaletteInfo {
  id: ThemePaletteId;
  name: string;
  category: string;
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
    name: 'Teal Capital',
    category: 'Institutional Fintech',
    tagline: 'Modern Neo-Bank Clarity',
    vibe: 'Modern Fintech',
    primaryHex: '#0F766E',
    accentHex: '#14B8A6',
    bgHex: '#F0FDFA',
    cardHex: '#FFFFFF',
    badgeHex: '#0D9488',
    description: 'Deep petrol teal with crisp neo-mint accents. High clarity and focus.',
  },
  {
    id: 'forest',
    name: 'Alpine Forest',
    category: 'Private Wealth & ESG',
    tagline: 'Swiss Wealth & Sustainability',
    vibe: 'Private Wealth',
    primaryHex: '#14532D',
    accentHex: '#16A34A',
    bgHex: '#F0FDF4',
    cardHex: '#FFFFFF',
    badgeHex: '#15803D',
    description: 'Deep British evergreen pine with warm linen and sage accents.',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Titanium',
    category: 'Executive Monochrome',
    tagline: 'High-Density Minimalist Carbon',
    vibe: 'Monochrome Pro',
    primaryHex: '#18181B',
    accentHex: '#71717A',
    bgHex: '#FAFAFA',
    cardHex: '#FFFFFF',
    badgeHex: '#27272A',
    description: 'Pure neutral carbon with polished titanium steel tones. Timeless contrast.',
  },
  {
    id: 'amber',
    name: 'Imperial Amber',
    category: 'Prestige Asset Mgmt',
    tagline: 'Prestige Luxury & Burnished Gold',
    vibe: 'Prestige Gold',
    primaryHex: '#B45309',
    accentHex: '#F59E0B',
    bgHex: '#FFFBEB',
    cardHex: '#FFFFFF',
    badgeHex: '#92400E',
    description: 'Warm burnished amber with champagne and gold accents. Refined luxury.',
  },
  {
    id: 'terracotta',
    name: 'Warm Bronze',
    category: 'Artisanal & Editorial',
    tagline: 'Architectural Earth & Ochre',
    vibe: 'Warm Editorial',
    primaryHex: '#9A3412',
    accentHex: '#EA580C',
    bgHex: '#FFF7ED',
    cardHex: '#FFFFFF',
    badgeHex: '#7C2D12',
    description: 'Rich earthy terracotta and baked umber with desert sand tones.',
  },
  {
    id: 'slate',
    name: 'Slate Mineral',
    category: 'Corporate Audit & Swiss',
    tagline: 'Neutral Swiss Precision',
    vibe: 'Swiss Precision',
    primaryHex: '#334155',
    accentHex: '#64748B',
    bgHex: '#F8FAFC',
    cardHex: '#FFFFFF',
    badgeHex: '#1E293B',
    description: 'Deep mineral slate and cool iron. Minimalist corporate clarity.',
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
    document.documentElement.setAttribute('data-theme', id);
    setPaletteState(id);
    try {
      localStorage.setItem(STORAGE_PALETTE_KEY, id);
    } catch (e) {
      console.error('Failed to save theme palette to localStorage', e);
    }
  };

  const setIsDark = (dark: boolean) => {
    if (dark === isDark) return;
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setIsDarkState(dark);
    try {
      localStorage.setItem(STORAGE_DARK_KEY, String(dark));
    } catch (e) {
      console.error('Failed to save theme dark mode to localStorage', e);
    }
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
