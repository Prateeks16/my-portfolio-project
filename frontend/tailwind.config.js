/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ground — deepest OLED black; the CRM sits one step off pure void.
        paper: '#050505',
        'paper-app': '#08080A',
        surface: '#0C0C0F',
        'surface-sunk': '#101014',
        'ink-panel': '#08080B',

        // Ink — inverted for an OLED ground. `ink` is the brightest foreground.
        ink: {
          DEFAULT: '#F4F4F7',
          secondary: '#A4A4B0',
          tertiary: '#7C7C8A',
        },

        // Hairlines are kept as solid hex rather than white/alpha so that the
        // opacity modifiers already used across the app (`border-line/40`)
        // still compile. Both values match white at 8% and 16% over the glass.
        line: {
          DEFAULT: '#1E1E23',
          strong: '#2F2F38',
        },

        // The mesh accents. Used for glow and state, never as a fill.
        accent: {
          emerald: '#10B981',
          violet: '#8B5CF6',
        },

        // Semantic — lifted for a dark ground, all >=4.5:1 on surface.
        success: { DEFAULT: '#5CD69A', bg: '#0F2019' },
        warning: { DEFAULT: '#F2C260', bg: '#241C0D' },
        danger: { DEFAULT: '#FB8B8B', bg: '#251315' },
        info: { DEFAULT: '#86CDF2', bg: '#0E1E28' },

        // Text that sits on a light pill (primary buttons, active nav).
        'on-accent': '#050505',

        // Legacy aliases kept so any missed markup keeps compiling
        'cream-bg': '#050505',
        'dark-text': '#F4F4F7',
        'soft-text': '#A4A4B0',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['Space Grotesk', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Fixed rem scale for the CRM (ratio ~1.15), never fluid.
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        label: ['0.75rem', { lineHeight: '1.05rem' }],
        body: ['0.875rem', { lineHeight: '1.35rem' }],
        panel: ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
        page: ['1.5rem', { lineHeight: '1.9rem', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        // Depth on glass is an inner highlight and a wide ambient fall.
        row: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        panel:
          'inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px -28px rgba(0,0,0,0.9)',
        over:
          'inset 0 1px 0 rgba(255,255,255,0.08), 0 40px 90px -24px rgba(0,0,0,0.95)',
        edge: 'inset 0 1px 1px rgba(255,255,255,0.15)',
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 18px 50px -18px rgba(16,185,129,0.35)',
      },
      borderRadius: {
        control: '10px',
        panel: '16px',
        shell: '2rem',
        core: '1.625rem',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fluid: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
