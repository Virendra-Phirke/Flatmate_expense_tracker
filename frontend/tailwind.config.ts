import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      screens: {
        xs: '360px',
      },
      fontFamily: {
        sans: ['DM Sans', 'Arial', 'Helvetica', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        'brand-soft': 'hsl(var(--accent))',
        'surface-subtle': 'hsl(var(--secondary))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Semantic financial status tokens. Legacy pos/neg/warn names remain
        // mapped here to avoid breaking existing page components during migration.
        positive: {
          DEFAULT: 'hsl(var(--positive) / <alpha-value>)',
          soft: 'hsl(var(--positive-soft) / <alpha-value>)',
        },
        negative: {
          DEFAULT: 'hsl(var(--negative) / <alpha-value>)',
          soft: 'hsl(var(--negative-soft) / <alpha-value>)',
        },
        pending: {
          DEFAULT: 'hsl(var(--pending) / <alpha-value>)',
          soft: 'hsl(var(--pending-soft) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          soft: 'hsl(var(--info-soft) / <alpha-value>)',
        },
        pos: {
          DEFAULT: 'hsl(var(--positive) / <alpha-value>)',
          foreground: 'hsl(var(--positive) / <alpha-value>)',
          bg: 'hsl(var(--positive-soft) / <alpha-value>)',
        },
        neg: {
          DEFAULT: 'hsl(var(--negative) / <alpha-value>)',
          foreground: 'hsl(var(--negative) / <alpha-value>)',
          bg: 'hsl(var(--negative-soft) / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'hsl(var(--pending) / <alpha-value>)',
          foreground: 'hsl(var(--pending) / <alpha-value>)',
          bg: 'hsl(var(--pending-soft) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
