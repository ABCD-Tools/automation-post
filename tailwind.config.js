/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy colors (kept for backward compatibility)
        dark: "#26374D",
        light: "#DDE6ED",
        
        // Primary Colors - Aqua/Blue Scale (watercolor aesthetic)
        primary: {
          50: "#E6F7FF",   // Very light aqua
          100: "#BAE7FF",  // Light aqua
          200: "#91D5FF",  // Soft aqua
          300: "#69C0FF",  // Medium aqua
          400: "#40A9FF",  // Bright aqua
          500: "#1890FF",  // Primary aqua blue
          600: "#096DD9",  // Deeper blue
          700: "#0050B3",  // Deep blue
          800: "#003A8C",  // Very deep blue
          900: "#002766",  // Darkest blue
        },
        
        // Accent Colors - Orange/Golden Scale
        accent: {
          50: "#FFF7E6",   // Very light golden
          100: "#FFE7BA",  // Light golden
          200: "#FFD591",  // Soft golden
          300: "#FFC069",  // Medium golden
          400: "#FFA940",  // Bright golden
          500: "#F5A623",  // Primary orange/golden
          600: "#D48806",  // Deeper orange
          700: "#AD6800",  // Deep orange
          800: "#874D00",  // Very deep orange
          900: "#613400",  // Darkest orange
        },
        
        // Semantic Colors
        success: {
          50: "#F6FFED",
          100: "#D9F7BE",
          200: "#B7EB8F",
          300: "#95DE64",
          400: "#73D13D",
          500: "#52C41A",
          600: "#389E0D",
          700: "#237804",
          800: "#135200",
          900: "#092B00",
        },
        error: {
          50: "#FFF1F0",
          100: "#FFCCC7",
          200: "#FFA39E",
          300: "#FF7875",
          400: "#FF4D4F",
          500: "#F5222D",
          600: "#CF1322",
          700: "#A8071A",
          800: "#820014",
          900: "#5C0011",
        },
        warning: {
          50: "#FFFBE6",
          100: "#FFF1B8",
          200: "#FFE58F",
          300: "#FFD666",
          400: "#FFC53D",
          500: "#FAAD14",
          600: "#D48806",
          700: "#AD6800",
          800: "#874D00",
          900: "#613400",
        },
        info: {
          50: "#E6F7FF",
          100: "#BAE7FF",
          200: "#91D5FF",
          300: "#69C0FF",
          400: "#40A9FF",
          500: "#1890FF",
          600: "#096DD9",
          700: "#0050B3",
          800: "#003A8C",
          900: "#002766",
        },
        
        // Surface Colors
        surface: {
          background: "#F0F9FF",      // Very light blue with watercolor feel
          card: "#FFFFFF",              // Card/form background
          border: "#E0F2FE",           // Subtle dividers
          hover: "#F0F9FF",            // Hover states
        },
        
        // Text Colors
        text: {
          primary: "#1A1A1A",          // High contrast
          secondary: "#6B7280",        // Muted
          disabled: "#9CA3AF",         // Disabled state
          inverse: "#FFFFFF",           // Text on dark backgrounds
        },
      },
      
      fontFamily: {
        sans: ['Jakarta-Sans', 'system-ui', 'sans-serif'],
      },
      
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'glow-primary': '0 0 20px rgba(24, 144, 255, 0.3)',
        'glow-accent': '0 0 20px rgba(245, 166, 35, 0.3)',
      },
    },
  },
  plugins: [],
};
