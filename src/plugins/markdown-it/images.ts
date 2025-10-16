import { type PluginSimple } from 'markdown-it';
// import { logged } from '@/utils/functions';

export const changeImage = (base: string): PluginSimple => markdownIt => {
  const originalImageRenderer = markdownIt.renderer.rules.image || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];

    if (!token) {
      return originalImageRenderer(tokens, idx, options, env, self);
    }

    const srcIndex = token.attrIndex('src');
    if (token.attrIndex('noexpand') < 0) {
      token.tag = 'expandable-image';
    }

    if (token.attrs && srcIndex >= 0) {
      if (!base.endsWith('/')) {
        base += '/';
      }

      const attributePair = token.attrs[srcIndex];
      if (attributePair) {
        attributePair[1] = base + attributePair[1];
      }
    }
    return originalImageRenderer(tokens, idx, options, env, self);
  };
}
