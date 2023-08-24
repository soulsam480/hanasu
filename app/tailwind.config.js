/** @type {import('tailwindcss').Config} */
export default {
  content: ['src/**/*.{vue,ts}'],
  theme: {
    extend: {},
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        '.el-button': {
          'background-color': 'var(--el-button-bg-color,var(--el-color-white))',
        },
      });
    },
  ],
};
