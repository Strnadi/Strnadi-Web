import { type PluginSimple } from 'markdown-it';

export const changeLink = (target: HTMLAnchorElement["target"], base: string): PluginSimple =>
  (markdownIt) => {
    const originalLinkRender = markdownIt.renderer.rules['link_open'] || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    markdownIt.renderer.rules['link_open'] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];

      if (!token) {
        return originalLinkRender(tokens, idx, options, env, self);
      }

      const targetIndex = token.attrIndex('target');
      const hrefIndex = token.attrIndex('href');

      if (targetIndex < 0) {
        token.attrPush(['target', target]);
      } else if (token.attrs) {
        const attributePair = token.attrs[targetIndex];
        if (attributePair) {
          attributePair[1] = target;
        }
      }

      if (
        token.attrs &&
        hrefIndex >= 0 &&
        token.attrs[hrefIndex] &&
        !token.attrs[hrefIndex][1].startsWith('http') &&
        !token.attrs[hrefIndex][1].startsWith('mailto') &&
        !token.attrs[hrefIndex][1].startsWith('tel') &&
        !token.attrs[hrefIndex][1].startsWith('javascript') &&
        !token.attrs[hrefIndex][1].startsWith('data') &&
        !token.attrs[hrefIndex][1].startsWith('ftp') &&
        !token.attrs[hrefIndex][1].startsWith('ws') &&
        !token.attrs[hrefIndex][1].startsWith('file') &&
        !token.attrs[hrefIndex][1].startsWith('blob') &&
        !token.attrs[hrefIndex][1].startsWith('#')
      ) {
        token.attrs[hrefIndex][1] = `${base}/${token.attrs[hrefIndex][1]}`;
      }

      token.attrPush(['external', 'true']);

      return originalLinkRender(tokens, idx, options, env, self);
    };
  }
