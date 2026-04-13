import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Jellyfin-inspired dark palette
        jf: {
          bg: '#101010',
          surface: '#1c1c1c',
          elevated: '#252525',
          overlay: '#2d2d2d',
          border: '#333333',
          'border-subtle': '#222222',
          // Primary — Jellyfin purple
          primary: '#AA5CC3',
          'primary-hover': '#9b4db4',
          'primary-light': '#c47dd8',
          'primary-muted': 'rgba(170,92,195,0.15)',
          // Accent — Jellyfin blue
          accent: '#0086b0',
          'accent-hover': '#0097c4',
          // Text
          'text-primary': '#ffffff',
          'text-secondary': '#aaaaaa',
          'text-muted': '#666666',
          // Status
          success: '#4caf50',
          'success-muted': 'rgba(76,175,80,0.15)',
          warning: '#ff9800',
          'warning-muted': 'rgba(255,152,0,0.15)',
          error: '#ff5252',
          'error-muted': 'rgba(255,82,82,0.15)',
          info: '#2196f3',
          'info-muted': 'rgba(33,150,243,0.15)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.4)',
        modal: '0 8px 32px rgba(0,0,0,0.6)',
        'card-hover': '0 4px 16px rgba(170,92,195,0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'jf-header':
          'linear-gradient(180deg, rgba(170,92,195,0.08) 0%, transparent 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [forms({ strategy: 'class' })],
}

export default config
