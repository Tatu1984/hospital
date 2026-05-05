/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Same accent palette as the web portal so the patient app feels
        // like the same product. Override `primary` once the client provides
        // their final brand colour (mid-late May 2026 per project plan).
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        // System fonts for now — once branding lands we can ship a custom
        // font via expo-font and update this list in one place.
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
