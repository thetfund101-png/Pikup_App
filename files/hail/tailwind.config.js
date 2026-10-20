/** @type {import('tailwindcss').Config} */
// Keep colors in sync with src/components/ui/theme.ts (used where className isn't available).
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        asphalt: { DEFAULT: '#1B2A2F', soft: '#33464D', mute: '#6B7C82' },
        signal: { DEFAULT: '#F5B700', dark: '#C99600', light: '#FFF4CC' },
        paper: '#F6F7F4',
        line: '#DDE2DE',
        go: '#1F9D6B',
        alert: '#D64545',
      },
      fontFamily: {
        display: ['Sora_700Bold'],
        heading: ['Sora_600SemiBold'],
        body: ['DMSans_400Regular'],
        'body-medium': ['DMSans_500Medium'],
        'body-bold': ['DMSans_700Bold'],
      },
    },
  },
  plugins: [],
};
