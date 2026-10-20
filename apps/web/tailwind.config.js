/** @type {import('tailwindcss').Config} */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default {
  content: [path.join(here, 'index.html'), path.join(here, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FDF8F3',
          soft: '#F7F0FF',
        },
        ink: { DEFAULT: '#2C2540' },
        /** Hairline borders and faint text, as explicit rgba so @apply works. */
        hair: {
          DEFAULT: 'rgba(44,37,64,0.10)',
          8: 'rgba(44,37,64,0.08)',
          12: 'rgba(44,37,64,0.12)',
          25: 'rgba(44,37,64,0.25)',
        },
        muted: {
          DEFAULT: '#6E6689',
          faint: '#9C95B2',
        },
        coral: {
          50: '#FFF1EC',
          100: '#FFE0D5',
          300: '#FFAB93',
          500: '#FF7A5C',
          600: '#F2603F',
          700: '#D74A2B',
        },
        lilac: {
          50: '#F3EEFF',
          100: '#E7DEFF',
          300: '#C4A9E8',
          500: '#8B7CC7',
        },
        mint: {
          50: '#E9F8F2',
          100: '#D5F0E6',
          300: '#9FDFC9',
          500: '#5FBFA0',
        },
        peach: {
          50: '#FFF1E8',
          100: '#FFE2D2',
          300: '#FFC5A6',
        },
        butter: {
          50: '#FFF8E4',
          100: '#FFEFCA',
          300: '#F7DC94',
        },
        sky: {
          50: '#EAF3FF',
          100: '#D6E8FF',
          300: '#A8CCFB',
        },
        rose: {
          50: '#FFEDF1',
          100: '#FFDCE4',
          300: '#F9A9BC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 18px 50px -24px rgba(44, 37, 64, 0.28)',
        lift: '0 26px 70px -28px rgba(44, 37, 64, 0.38)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.75)' },
        },
        'drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) rotate(0deg)' },
          '50%': { transform: 'translate3d(0,-10px,0) rotate(3deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        drift: 'drift 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
