import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#070d1a',
        surface: '#0d1e35',
        border: '#1a2e4a',
        'border-light': '#1e3a5f',
        accent: '#00c878',
        'accent-dim': '#00a86b',
        muted: '#4a6785',
        'text-dim': '#6b8db5',
      },
      fontFamily: {
        mono: ['DM Mono', 'Courier New', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
