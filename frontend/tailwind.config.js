/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ground
        paper: '#ECEBE9',
        'paper-app': '#F4F2EF',
        surface: '#FFFFFF',
        'surface-sunk': '#FAF9F7',
        'ink-panel': '#1C1A17',

        // Ink — every neutral is warm-shifted; no cool grays in this world.
        ink: {
          DEFAULT: '#171512',
          secondary: '#57514A',
          tertiary: '#6B6259',
        },
        line: {
          DEFAULT: '#E3DED6',
          strong: '#CFC7BC',
        },

        // Semantic — muted for a paper world, all >=4.5:1 on white
        success: { DEFAULT: '#3F6B4A', bg: '#EDF3EE' },
        warning: { DEFAULT: '#8A5A11', bg: '#FBF3E4' },
        danger: { DEFAULT: '#8C3A2E', bg: '#FAEDEA' },
        info: { DEFAULT: '#3A5A78', bg: '#EDF2F7' },

        // Legacy aliases kept so existing portfolio markup keeps compiling
        'cream-bg': '#ECEBE9',
        'dark-text': '#171512',
        'soft-text': '#57514A',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
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
        row: '0 1px 2px rgba(23,21,18,0.05)',
        panel: '0 1px 3px rgba(23,21,18,0.06), 0 8px 24px -12px rgba(23,21,18,0.10)',
        over: '0 12px 32px -8px rgba(23,21,18,0.22)',
      },
      borderRadius: {
        control: '8px',
        panel: '12px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
