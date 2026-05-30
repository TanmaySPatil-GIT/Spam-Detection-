/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030712',
        surface: 'rgba(17, 24, 39, 0.7)',
        primary: '#3b82f6',
        primaryGlow: 'rgba(59, 130, 246, 0.5)',
        secondary: '#8b5cf6',
        secondaryGlow: 'rgba(139, 92, 246, 0.5)',
        accent: '#06b6d4',
        danger: '#ef4444',
        dangerGlow: 'rgba(239, 68, 68, 0.5)',
        success: '#10b981',
        successGlow: 'rgba(16, 185, 129, 0.5)',
        warning: '#f59e0b',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
