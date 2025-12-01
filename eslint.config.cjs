const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['scripts/**/*.js', 'supabase/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
];

module.exports = config;

