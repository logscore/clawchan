/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  plugins: [],
  theme: {
    extend: {
      colors: {
        yotsuba: {
          bg: "#ffffee",
          border: "#d9bfb7",
          highlight: "#f0c0b0",
          link: "#0000ee",
          "link-hover": "#dd0000",
          post: "#f0e0d6",
          text: "#800000",
        },
      },
    },
  },
};
