// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: 'airbnb-base',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // Tambahkan atau sesuaikan aturan di sini jika perlu
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-new': 'off', // Izinkan `new` untuk class view, model, dll.
    'no-underscore-dangle': ['error', { 'allowAfterThis': true }], // Izinkan underscore setelah this (this._privateMethod)
    'class-methods-use-this': 'off', // Izinkan method class yang tidak menggunakan 'this'
    'import/extensions': ['error', 'always', { // Pastikan ekstensi .js ada di impor lokal
      js: 'always',
    }],
    // 'no-param-reassign': ['error', { props: false }], // Bolehkan reassign properti parameter (kadang berguna)
  },
  ignorePatterns: ['dist/', 'node_modules/', 'webpack.config.js'], // Abaikan folder/file tertentu
};
