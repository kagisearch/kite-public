/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: [
      './src/**/*.{html,js,svelte,ts}',
      './src/app.html'
    ],
    extract: {
      // For Svelte files, only extract content from template and style blocks
      svelte: (content) => {
        // Remove script blocks to prevent JavaScript variables from being parsed as CSS
        const withoutScript = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        return withoutScript;
      }
    }
  },
  theme: {
    extend: {
      // Custom colors for your Kite app
      colors: {
        // You can add custom colors here
      },
      // Custom spacing, fonts, etc.
      fontFamily: {
        // Add custom fonts if needed
      },
      animation: {
        // Custom animations
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Add any Tailwind plugins here
  ],
  darkMode: 'class', // Enable class-based dark mode
};