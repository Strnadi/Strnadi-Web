import globals from 'globals'
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  pluginVue.configs['flat/recommended'],

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      "@typescript-eslint/restrict-template-expressions": {
        allowBoolean: true
      }
    },
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    }
  }
);
