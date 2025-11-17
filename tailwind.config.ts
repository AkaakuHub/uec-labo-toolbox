import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './entrypoints/**/*.{ts,tsx,html}',
    './src/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        surface: '#F9FAFB',
        surfaceAlt: '#F3F4F6',
      },
    },
    fontFamily: {
      sans: ['\"Inter\"', 'system-ui', 'sans-serif'],
    },
  },
  plugins: [],
};

export default config;
