/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080810',
        surface: '#0f0f1a',
        border: '#1a1a2e',
        accent: '#00ff88',
        dim: '#4a4a6a',
        muted: '#2a2a3e',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
