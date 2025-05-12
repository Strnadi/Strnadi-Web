import { type PluginSimple } from 'markdown-it';
// import { logged } from '@/utils/functions';

export const changeImage = (base: string): PluginSimple =>
  (markdownIt) => {
    const originalImageRenderer = markdownIt.renderer.rules.image || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      token.tag = 'expandable-image';

      if (srcIndex >= 0) {
        if(!base.endsWith('/')) {
          base += '/';
        }

        token.attrs![srcIndex][1] = base + token.attrs![srcIndex][1];
      }
      return originalImageRenderer(tokens, idx, options, env, self);
    };
  }
