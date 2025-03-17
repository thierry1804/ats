/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3771FA',
          light: '#37AFFA',
          dark: '#3A37FA',
        },
        secondary: {
          DEFAULT: '#7A37FA',
          light: '#BA37FA',
          dark: '#231FF5',
        },
      },
    },
  },
  plugins: [],
};
