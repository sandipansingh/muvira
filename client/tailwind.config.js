/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        ivory: 'var(--color-ivory)',
        ink: 'var(--color-ink)',
        'muted-ink': 'var(--color-muted-ink)',
        line: 'var(--color-line)',
        cognac: 'var(--color-cognac)',
        'cognac-dark': 'var(--color-cognac-dark)',
        'cognac-soft': 'var(--color-cognac-soft)',
        success: 'var(--color-success)',
        'success-soft': 'var(--color-success-soft)',
        danger: 'var(--color-danger)',
        'danger-soft': 'var(--color-danger-soft)',
        warning: 'var(--color-warning)',
        'warning-soft': 'var(--color-warning-soft)',
      },
      fontFamily: {
        sans: ['Red Hat Display', 'system-ui', 'sans-serif'],
        serif: ['Pangram', 'system-ui', 'sans-serif'],
        display: ['Pangram', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
