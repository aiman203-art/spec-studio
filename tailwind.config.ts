import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm dark surfaces (hero / nav sections)
        bg:      '#0e0c09',
        surface: '#1a1710',
        card:    '#241f14',
        border:  '#2e2820',
        // Amber / gold accent
        accent: {
          DEFAULT: '#c9922a',
          hover:   '#d9a83e',
          active:  '#b07e1e',
        },
        // Text
        ink:   '#f5f0e8',
        muted: '#a89880',
        faint: '#6b5e4a',
        // Cream light surfaces (content sections)
        cream: {
          DEFAULT: '#f5f0e8',
          dark:    '#ede6d6',
          border:  '#d6cfc2',
        },
        // Status
        approve: '#4caf6e',
        reject:  '#e5564b',
        // Signature accent cards
        signature: {
          amber:  '#c9922a',
          dark:   '#1a1710',
          forest: '#0a2e0e',
          coral:  '#aa2d00',
          cream:  '#f5f0e8',
        },
      },
      borderRadius: {
        sm:   '6px',
        md:   '12px',
        lg:   '16px',
        xl:   '24px',
        pill: '9999px',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.1', fontWeight: '400', letterSpacing: '-0.02em' }],
        'display-md': ['36px', { lineHeight: '1.15', fontWeight: '400', letterSpacing: '-0.01em' }],
        'title-lg':   ['24px', { lineHeight: '1.3',  fontWeight: '400' }],
        'title-md':   ['20px', { lineHeight: '1.4',  fontWeight: '500' }],
        'title-sm':   ['17px', { lineHeight: '1.4',  fontWeight: '500' }],
        label:        ['15px', { lineHeight: '1.4',  fontWeight: '500' }],
        body:         ['14px', { lineHeight: '1.6',  fontWeight: '400' }],
        caption:      ['12px', { lineHeight: '1.4',  fontWeight: '500', letterSpacing: '0.04em' }],
      },
      boxShadow: {
        card:   '0 2px 12px 0 rgba(0,0,0,0.25)',
        'card-hover': '0 6px 24px 0 rgba(0,0,0,0.35)',
        glow:   '0 0 0 3px rgba(201,146,42,0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config
