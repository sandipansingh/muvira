/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#C88D35',
          primaryHover: '#B27B2A',
          primaryLight: '#FDF8F0',
          bg: '#FFFFFF',
          card: '#F6F4EF',
          cardHover: '#F0ECE3',
          border: '#E8E4DC',
          charcoal: '#18181B',
          darkBg: '#121214',
          muted: '#716E69',
        },
        // Legacy tokens mapped for gradual migration
        primaryBg: '#C88D35',
        primaryHover: '#B27B2A',
        primary400: '#D99F4E',
        primary600: '#B27B2A',
        primaryActive: '#A16A1E',
        primary200: '#F5E6CE',
        primary300: '#EBCB9B',
        primary100: '#FDF8F0',
        secondary200: '#E8E4DC',
        secondary300: '#D6D0C4',
        secondary400: '#A39C90',
        secondary500: '#716E69',
        secondary600: '#4A4844',
        secondary700: '#2B2927',
        secondarytext: '#716E69',
        darkColor: '#18181B',
        successColor: '#10B981',
        dangerColor: '#EF4444',
        lightgrayColor: '#F6F4EF',

        // New elevated heritage tokens
        accent: '#C88D35',
        accentDark: '#B27B2A',
        gold: '#C88D35',
        goldLight: '#E8C58D',
        cream: '#F6F4EF',
        walnut: '#2B2927',
        stone: '#716E69',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        // Legacy font references mapped
        redhatRegular: ['"Plus Jakarta Sans"', 'sans-serif'],
        redhatMedium: ['"Plus Jakarta Sans"', 'sans-serif'],
        redhatBold: ['"Plus Jakarta Sans"', 'sans-serif'],
        robotoRegular: ['"Plus Jakarta Sans"', 'sans-serif'],
        robotoMedium: ['"Plus Jakarta Sans"', 'sans-serif'],
        pangramRegular: ['"Cormorant Garamond"', 'serif'],
        pangramBold: ['"Cormorant Garamond"', 'serif'],
        abhaya: ['"Cormorant Garamond"', 'serif'],
        annapurna: ['"Cormorant Garamond"', 'serif'],
      },
      fontSize: {
        // Custom type scale per design spec
        font10: ['10px', { lineHeight: '1.2' }],
        font11: ['11px', { lineHeight: '1.2' }],
        font12: ['12px', { lineHeight: '1.3' }],
        font13: ['13px', { lineHeight: '1.4' }],
        font19: ['19px', { lineHeight: '1.3' }],
      },
      borderRadius: {
        // Strict system per anti-vibe guidelines
        sm: '6px', // cards, inputs, small elements
        md: '12px', // modals, larger containers
        lg: '16px', // featured sections
        full: '9999px',
      },
      boxShadow: {
        card: '0 0 6px rgba(0,0,0,0.2)',
        megamenu: '0 4px 7.28px 0.72px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}
