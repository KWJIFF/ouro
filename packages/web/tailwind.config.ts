import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ouro: {
          bg: '#0c0c0f',
          surface: '#161619',
          border: '#2a2a2e',
          text: '#e8e8e8',
          muted: '#888',
          accent: '#8b5cf6',
          signal: '#6366f1',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
export default config;
