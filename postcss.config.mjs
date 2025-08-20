// postcss.config.mjs

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // ESKİ: 'tailwindcss': {},
    // YENİ: '@tailwindcss/postcss': {},
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
  },
};

export default config;