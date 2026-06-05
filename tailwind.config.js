/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0fc6c2',
          50: '#e8f9f8',
          100: '#d1f3f1',
          200: '#a3e7e4',
          300: '#75dbd7',
          400: '#47cfca',
          500: '#0fc6c2',
          600: '#0da8a5',
          700: '#0a8a87',
          800: '#086c6a',
          900: '#054e4d',
        },
        background: '#f0f2f5',
        foreground: '#1a1a2e',
        muted: {
          DEFAULT: '#f0f2f5',
          foreground: '#6b7280',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1a1a2e',
        },
        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#0fc6c2',
        destructive: '#ef4444',
        success: '#10b981',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
