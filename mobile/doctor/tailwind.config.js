/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Matches the web portal's slate theme (frontend/src/index.css
        // --primary: hsl(222 47% 11%) and --destructive: hsl(0 72% 51%)).
        // Same palette as the patient app so both surfaces feel like one
        // product family.
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#334155',
          600: '#0f1729',
          700: '#0b1220',
          900: '#020617',
        },
        secondary: '#f1f5f9',
        destructive: '#dc2828',
        muted: '#64748b',
        border: '#e2e8f0',
      },
      fontFamily: {
        // Same family as the web portal (frontend/src/index.css).
        sans: ['Inter_400Regular'],
      },
    },
  },
  plugins: [],
};
