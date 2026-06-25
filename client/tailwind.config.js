/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy tokens mapped for gradual migration
        primaryBg: '#c65c30',
        primaryHover: '#a74b26',
        primary400: '#d6754a',
        primary600: '#a74b26',
        primaryActive: '#a74b26',
        primary200: '#f2c3a8',
        primary300: '#e8a57c',
        primary100: '#f9f0e8',
        secondary200: '#e6dfd5',
        secondary300: '#d1c7b9',
        secondary400: '#a59a8c',
        secondary500: '#766d63',
        secondary600: '#524a42',
        secondary700: '#3f3832',
        secondarytext: '#665f59',
        darkColor: '#2c2724',
        successColor: '#4CAF4F',
        dangerColor: '#c65c30',
        lightgrayColor: '#f4ede3',

        // New elevated heritage tokens
        accent: '#c65c30',
        accentDark: '#a74b26',
        gold: '#a77f4f',
        goldLight: '#c5a26f',
        cream: '#f9f5ef',
        walnut: '#2c2724',
        stone: '#665f59',
      },
      fontFamily: {
        // Primary UI font (nav, headings, buttons, product titles)
        redhatRegular: ['red_hat_displayregular', 'system-ui', 'sans-serif'],
        redhatMedium: ['red_hat_displaymedium', 'system-ui', 'sans-serif'],
        redhatBold: ['red_hat_displaybold', 'system-ui', 'sans-serif'],
        // Secondary UI font (search, body copy, sign-in)
        robotoRegular: ['robotoregular', 'system-ui', 'sans-serif'],
        robotoMedium: ['robotomedium', 'system-ui', 'sans-serif'],
        // Accent / marketing font (hero CTAs, sale labels)
        pangramRegular: ['pangramregular', 'system-ui', 'sans-serif'],
        pangramBold: ['pangrambold', 'system-ui', 'sans-serif'],
        // Vernacular fonts
        abhaya: ['Abhaya Libre', 'serif'],
        annapurna: ['Annapurna SIL', 'serif'],
      },
      fontSize: {
        // Custom type scale per design spec
        'font10': ['10px', { lineHeight: '1.2' }],
        'font11': ['11px', { lineHeight: '1.2' }],
        'font12': ['12px', { lineHeight: '1.3' }],
        'font13': ['13px', { lineHeight: '1.4' }],
        'font19': ['19px', { lineHeight: '1.3' }],
      },
      borderRadius: {
        // Strict system per anti-vibe guidelines
        sm: '6px',   // cards, inputs, small elements
        md: '12px',  // modals, larger containers
        lg: '16px',  // featured sections
        full: '9999px',
      },
      boxShadow: {
        'card': '0 0 6px rgba(0,0,0,0.2)',
        'megamenu': '0 4px 7.28px 0.72px rgba(0,0,0,0.2)',
      }
    },
  },
  plugins: [],
}
