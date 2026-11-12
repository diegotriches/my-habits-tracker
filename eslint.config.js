// eslint.config.js
// Regras do Expo (React, React Native, hooks, TypeScript) + eslint-config-prettier,
// que desliga as regras de formatação — formatar é trabalho do Prettier.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'android/**',
      'ios/**',
      'dist/**',
      '.expo/**',
      'node_modules/**',
      // Deno (Edge Functions): outro ambiente, fora do lint do app.
      'supabase/functions/**',
      // Gerado pelo `supabase gen types`.
      'types/supabase.ts',
    ],
  },
]);
