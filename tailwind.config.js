/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        yotsuba: {
          bg: '#ffffee',
          post: '#f0e0d6',
          highlight: '#f0c0b0',
          border: '#d9bfb7',
          text: '#800000',
          link: '#0000ee',
          'link-hover': '#dd0000',
        },
      },
    },
  },
  plugins: [],
};
