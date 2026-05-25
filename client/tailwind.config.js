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
        // Distinctive, non-generic fonts
        playfair: ['Playfair Display', 'Georgia', 'serif'],
        instrument: ['Instrument Sans', 'system-ui', 'sans-serif'],
        // Keep legacy aliases mapped to new for compatibility
        redhat: ['Instrument Sans', 'system-ui', 'sans-serif'],
        montserrat: ['Playfair Display', 'Georgia', 'serif'],
        lato: ['Instrument Sans', 'system-ui', 'sans-serif'],
        roboto: ['Instrument Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xs': 'calc(0.5rem - 4px)',
        'sm': 'calc(0.5rem - 4px)',
        'md': 'calc(0.5rem - 2px)',
        'lg': '0.5rem',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        'radius2': '2px',
        'radius3': '3px',
        'radius4': '4px',
        'radius5': '5px',
        'radius6': '6px',
        'radius7': '7px',
        'radius8': '8px',
        'radius10': '10px',
        'radius12': '30px',
        'radius14': '50px',
        'radius15': '100px',
      },
      boxShadow: {
        'card': '0 0 6px rgba(0,0,0,0.2)',
        'megamenu': '0 4px 7.28px 0.72px rgba(0,0,0,0.2)',
      }
    },
  },
  plugins: [],
}
