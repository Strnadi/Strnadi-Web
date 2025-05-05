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

export const changeLinkTarget = (target: HTMLAnchorElement["target"]): PluginSimple =>
  (markdownIt) => {
    const originalLinkRender = markdownIt.renderer.rules.link_open || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const aIndex = token.attrIndex('target');
      if (aIndex < 0) {
        token.attrPush(['target', target]);
      } else {
        token.attrs[aIndex][1] = target;
      }

      return originalLinkRender(tokens, idx, options, env, self);
    };
  }
