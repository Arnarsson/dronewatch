import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Dark ops-center theme
        background: '#0B1220',
        surface: '#0E1626',
        elevated: '#121C2E',
        muted: {
          DEFAULT: '#2D3B5F',
          foreground: '#94A3B8',
        },
        border: '#223152',
        input: '#223152',
        ring: '#FF8A00',

        // Primary accent - signal orange
        primary: {
          DEFAULT: '#FF8A00',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#FFC247',
          foreground: '#0B1220',
        },

        // Semantic colors
        destructive: {
          DEFAULT: '#F56565',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#68D391',
          foreground: '#0B1220',
        },
        warning: {
          DEFAULT: '#F6E05E',
          foreground: '#0B1220',
        },

        // Severity levels
        severity: {
          low: '#68D391',
          moderate: '#F6E05E',
          high: '#F6AD55',
          critical: '#F56565',
        },

        // Text colors
        foreground: '#F8FAFC',
        'foreground-secondary': '#E2E8F0',
        'foreground-muted': '#94A3B8',
        'foreground-dim': '#64748B',

        // Component specific
        card: {
          DEFAULT: '#0E1626',
          foreground: '#F8FAFC',
        },
        popover: {
          DEFAULT: '#121C2E',
          foreground: '#F8FAFC',
        },
        accent: {
          DEFAULT: '#FF8A00',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
        'xs': '0.75rem',   // 12px
        'sm': '0.875rem',  // 14px
        'base': '1rem',    // 16px
        'lg': '1.125rem',  // 18px
        'xl': '1.5rem',    // 24px
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
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
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'md': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'lg': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'xl': '0 16px 48px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 24px rgba(255, 138, 0, 0.15)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config