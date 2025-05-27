import eslint from '@eslint/js';
import { includeIgnoreFile } from "@eslint/compat";
import tseslint from 'typescript-eslint';
import vuePlugin from 'eslint-plugin-vue';
import globals from 'globals';
import { fileURLToPath } from "node:url";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));


export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  vuePlugin.configs['flat/recommended'],

  {
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser
      },

      parserOptions: {
        parser: tseslint.parser,
        projectService: {
          enabled: true,
          useFsEvents: true,
          watchOptions: {
            interval: 1000,
            recursive: true
          },
          allowDefaultProject: ["eslint.config.mjs", "prettier.config.js"]
        },
        extraFileExtensions: ['.vue'],

        tsconfigRootDir: import.meta.dirname,
        warnOnUnsupportedTypeScriptVersion: true
      }
    },

    rules: {
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowBoolean: true }
      ],

      'vue/multi-word-component-names': "off"
    }
  }
);
