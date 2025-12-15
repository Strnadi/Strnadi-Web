import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import type {
  SFCDescriptor,
  SFCScriptBlock,
  SFCScriptCompileOptions,
  SFCStyleCompileOptions,
  SFCTemplateCompileOptions
} from '@vue/compiler-sfc';
import * as compiler from '@vue/compiler-sfc';
import type { BunPlugin } from 'bun';

interface VuePluginFeatures {
  propsDestructure?: boolean;
  customElement?: boolean | string | RegExp | (string | RegExp)[];
  optionsAPI?: boolean;
  prodDevtools?: boolean;
  prodHydrationMismatchDetails?: boolean;
  componentIdGenerator?:
    | 'filepath'
    | 'filepath-source'
    | ((
        filepath: string,
        source: string,
        isProduction: boolean,
        getHash: (text: string) => string
      ) => string);
}

interface VuePluginOptions {
  include?: string | RegExp | (string | RegExp)[];
  exclude?: string | RegExp | (string | RegExp)[];
  isProduction?: boolean;
  script?: Partial<
    Omit<
      SFCScriptCompileOptions,
      | 'id'
      | 'isProd'
      | 'inlineTemplate'
      | 'templateOptions'
      | 'sourceMap'
      | 'genDefaultAs'
      | 'customElement'
      | 'defineModel'
      | 'propsDestructure'
    >
  > & {
    defineModel?: boolean;
    propsDestructure?: boolean;
  };
  template?: Partial<
    Omit<
      SFCTemplateCompileOptions,
      | 'id'
      | 'source'
      | 'ast'
      | 'filename'
      | 'scoped'
      | 'slotted'
      | 'isProd'
      | 'inMap'
      | 'ssr'
      | 'ssrCssVars'
      | 'preprocessLang'
    >
  >;
  style?: Partial<
    Omit<
      SFCStyleCompileOptions,
      | 'filename'
      | 'id'
      | 'isProd'
      | 'source'
      | 'scoped'
      | 'cssDevSourcemap'
      | 'postcssOptions'
      | 'map'
      | 'postcssPlugins'
      | 'preprocessCustomRequire'
      | 'preprocessLang'
      | 'preprocessOptions'
    >
  >;
  compiler?: typeof compiler;
  features?: VuePluginFeatures;
  customElement?: VuePluginFeatures['customElement'];
}

interface ResolvedOptions extends Omit<VuePluginOptions, 'isProduction'> {
  root: string;
  isProduction: boolean;
  sourceMap: boolean;
  cssDevSourcemap: boolean;
  devToolsEnabled: boolean;
  compiler: typeof compiler;
}

interface VueQuery {
  vue?: boolean;
  src?: string;
  type?: 'script' | 'template' | 'style' | 'custom';
  index?: number;
  lang?: string;
  raw?: boolean;
  url?: boolean;
  scoped?: boolean;
  id?: string;
}

const descriptorCache = new Map<string, SFCDescriptor>();
const scriptCache = new Map<string, SFCScriptBlock | null>();

const scriptIdentifier = `_sfc_main`;

const defaultCustomElementRE = /\.ce\.vue$/;

function parseVueRequest(id: string): { filename: string; query: VueQuery } {
  const [filename, rawQuery] = id.split('?', 2);
  const query = Object.fromEntries(
    new URLSearchParams(rawQuery || '')
  ) as VueQuery;
  if (query.vue != null) query.vue = true;
  if (query.index != null) query.index = Number(query.index);
  if (query.raw != null) query.raw = true;
  if (query.url != null) query.url = true;
  if (query.scoped != null) query.scoped = true;
  return { filename, query };
}

function normalizeToPosix(file: string): string {
  return file.split(path.sep).join('/');
}

function getHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);
}

function matchesCustomElement(
  file: string,
  option: VuePluginOptions['customElement'] | VuePluginFeatures['customElement']
): boolean {
  if (option == null) return defaultCustomElementRE.test(file);
  if (typeof option === 'boolean') return option;
  const tests = Array.isArray(option) ? option : [option];
  return tests.some((rule) =>
    typeof rule === 'string' ? file.match(rule) : rule.test(file)
  );
}

function resolveCompileTimeFlags(
  options: VuePluginOptions,
  isProduction: boolean
) {
  const features = options.features || {};
  return {
    optionsAPI: features.optionsAPI ?? true,
    prodDevtools: features.prodDevtools ?? false,
    prodHydrationMismatchDetails:
      features.prodHydrationMismatchDetails ?? false,
    devToolsEnabled: !!(features.prodDevtools || !isProduction)
  };
}

function setVueCompileTimeFlags(
  build: Bun.PluginBuilder,
  flags: ReturnType<typeof resolveCompileTimeFlags>
) {
  build.config.define ??= {};
  build.config.define['__VUE_PROD_DEVTOOLS__'] = flags.prodDevtools
    ? 'true'
    : 'false';
  build.config.define['__VUE_OPTIONS_API__'] = flags.optionsAPI
    ? 'true'
    : 'false';
  build.config.define['__VUE_PROD_HYDRATION_MISMATCH_DETAILS__'] =
    flags.prodHydrationMismatchDetails ? 'true' : 'false';
}

function createDescriptor(
  filename: string,
  source: string,
  options: ResolvedOptions
): SFCDescriptor {
  const { descriptor, errors } = options.compiler.parse(source, {
    filename,
    sourceMap: options.sourceMap,
    templateParseOptions: options.template?.compilerOptions
  });

  if (errors.length) {
    throw errors[0];
  }

  const normalizedPath = normalizeToPosix(
    path.relative(options.root, filename)
  );
  const generator = options.features?.componentIdGenerator;
  if (generator === 'filepath') {
    descriptor.id = getHash(normalizedPath);
  } else if (generator === 'filepath-source') {
    descriptor.id = getHash(normalizedPath + source);
  } else if (typeof generator === 'function') {
    descriptor.id = generator(
      normalizedPath,
      source,
      options.isProduction,
      getHash
    );
  } else {
    descriptor.id = getHash(
      normalizedPath + (options.isProduction ? source : '')
    );
  }

  descriptorCache.set(filename, descriptor);
  return descriptor;
}

function getDescriptor(
  filename: string,
  options: ResolvedOptions,
  source?: string
): SFCDescriptor {
  const cached = descriptorCache.get(filename);
  if (cached) return cached;
  const code = source ?? fs.readFileSync(filename, 'utf-8');
  return createDescriptor(filename, code, options);
}

function isUseInlineTemplate(descriptor: SFCDescriptor): boolean {
  return !!descriptor.scriptSetup && !descriptor.template?.src;
}

function resolveTemplateCompilerOptions(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  filename: string
): Omit<SFCTemplateCompileOptions, 'source'> | undefined {
  const block = descriptor.template;
  if (!block) return;

  const hasScoped = descriptor.styles.some((s) => s.scoped);
  const { id, cssVars } = descriptor;

  let transformAssetUrls = options.template?.transformAssetUrls;
  let assetUrlOptions: any;

  if (transformAssetUrls === false) {
    assetUrlOptions = undefined;
  } else {
    assetUrlOptions = { includeAbsolute: true };
  }

  if (transformAssetUrls && typeof transformAssetUrls === 'object') {
    if (Object.values(transformAssetUrls).some((val) => Array.isArray(val))) {
      transformAssetUrls = {
        ...assetUrlOptions,
        tags: transformAssetUrls as any
      };
    } else {
      transformAssetUrls = { ...assetUrlOptions, ...transformAssetUrls };
    }
  } else {
    transformAssetUrls = assetUrlOptions;
  }

  let preprocessOptions = block.lang && options.template?.preprocessOptions;
  if (block.lang === 'pug') {
    preprocessOptions = { doctype: 'html', ...preprocessOptions };
  }

  const expressionPlugins =
    options.template?.compilerOptions?.expressionPlugins || [];
  const lang = descriptor.scriptSetup?.lang || descriptor.script?.lang;
  if (lang && /tsx?$/.test(lang) && !expressionPlugins.includes('typescript')) {
    expressionPlugins.push('typescript');
  }

  return {
    ...options.template,
    // @ts-expect-error Vue 3.6 vapor flag
    vapor: (descriptor as any).vapor,
    id,
    filename,
    scoped: hasScoped,
    slotted: descriptor.slotted,
    isProd: options.isProduction,
    inMap: block.src ? undefined : block.map,
    ssr: false,
    ssrCssVars: cssVars,
    transformAssetUrls,
    preprocessLang: block.lang === 'html' ? undefined : block.lang,
    preprocessOptions,
    compilerOptions: {
      ...options.template?.compilerOptions,
      scopeId: hasScoped ? `data-v-${id}` : undefined,
      bindingMetadata: scriptCache.get(filename)?.bindings,
      expressionPlugins,
      sourceMap: options.sourceMap
    }
  };
}

function resolveScript(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  customElement: boolean
): SFCScriptBlock | null {
  if (!descriptor.script && !descriptor.scriptSetup) return null;

  const cached = scriptCache.get(descriptor.filename);
  if (cached) return cached;

  const resolved = options.compiler.compileScript(descriptor, {
    ...options.script,
    id: descriptor.id,
    isProd: options.isProduction,
    inlineTemplate: isUseInlineTemplate(descriptor),
    templateOptions: resolveTemplateCompilerOptions(
      descriptor,
      options,
      descriptor.filename
    ),
    sourceMap: options.sourceMap,
    genDefaultAs: isUseInlineTemplate(descriptor)
      ? scriptIdentifier
      : undefined,
    customElement,
    propsDestructure:
      options.features?.propsDestructure ?? options.script?.propsDestructure
  });

  scriptCache.set(descriptor.filename, resolved);
  return resolved;
}

async function compileTemplateModule(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  customElement: boolean
) {
  const block = descriptor.template!;
  const templateSource = block.src
    ? fs.readFileSync(
        path.resolve(path.dirname(descriptor.filename), block.src),
        'utf-8'
      )
    : block.content;

  const result = options.compiler.compileTemplate({
    ...resolveTemplateCompilerOptions(descriptor, options, descriptor.filename),
    id: descriptor.id,
    source: templateSource,
    ssr: false,
    isProd: options.isProduction,
    filename: descriptor.filename,
    scoped: descriptor.styles.some((s) => s.scoped),
    compilerOptions: {
      ...options.template?.compilerOptions,
      bindingMetadata: resolveScript(descriptor, options, customElement)
        ?.bindings
    }
  });

  if (result.errors.length) {
    throw result.errors[0];
  }

  return result.code;
}

async function compileStyleBlock(
  descriptor: SFCDescriptor,
  index: number,
  options: ResolvedOptions
) {
  const block = descriptor.styles[index];
  if (!block) return '';
  const source = block.src
    ? fs.readFileSync(
        path.resolve(path.dirname(descriptor.filename), block.src),
        'utf-8'
      )
    : block.content;

  const cssMapOptions = options.cssDevSourcemap
    ? {
        postcssOptions: {
          map: {
            from: descriptor.filename,
            inline: false,
            annotation: false
          }
        }
      }
    : {};

  const result = await options.compiler.compileStyleAsync({
    ...options.style,
    ...cssMapOptions,
    filename: descriptor.filename,
    id: `data-v-${descriptor.id}`,
    isProd: options.isProduction,
    source,
    scoped: block.scoped
  });

  if (result.errors.length) {
    throw result.errors[0];
  }

  return result.code;
}

function createMainModule(
  descriptor: SFCDescriptor,
  customElement: boolean,
  options: ResolvedOptions,
  inlineTemplate: boolean
) {
  const scopeId = `data-v-${descriptor.id}`;
  let code = `import script from ${JSON.stringify(
    `${descriptor.filename}?vue&type=script`
  )}\n`;

  if (descriptor.template && !inlineTemplate) {
    code += `import { render as _sfc_render } from ${JSON.stringify(
      `${descriptor.filename}?vue&type=template`
    )}\n`;
    code += 'script.render = _sfc_render\n';
  }

  descriptor.styles.forEach((style, index) => {
    const scopedQuery = style.scoped ? `&scoped=${descriptor.id}` : '';
    const langQuery = style.lang ? `&lang=${style.lang}` : '';
    code += `import ${JSON.stringify(
      `${descriptor.filename}?vue&type=style&index=${index}${scopedQuery}${langQuery}`
    )}\n`;
  });

  descriptor.customBlocks?.forEach((block, index) => {
    const langQuery = block.lang ? `&lang=${block.lang}` : '';
    code += `import ${JSON.stringify(
      `${descriptor.filename}?vue&type=${block.type}&index=${index}${langQuery}`
    )}\n`;
  });

  code += 'const __script = script\n';

  if (descriptor.styles.some((s) => s.scoped)) {
    code += `__script.__scopeId = ${JSON.stringify(scopeId)}\n`;
  }

  if (options.devToolsEnabled) {
    const file = options.isProduction
      ? path.basename(descriptor.filename)
      : descriptor.filename;
    code += `__script.__file = ${JSON.stringify(file)}\n`;
  }

  if (customElement) {
    code += `__script.__isCustomElement = true\n`;
  }

  code += 'export default __script\n';
  return code;
}

try {
  const ts = await import('typescript');
  compiler.registerTS(() => ts);
} catch {}

export default function plugin(options: VuePluginOptions = {}): BunPlugin {
  const isProduction =
    options.isProduction ?? process.env.NODE_ENV === 'production';
  const flags = resolveCompileTimeFlags(options, !!isProduction);

  const resolved: ResolvedOptions = {
    root: process.cwd(),
    sourceMap: true,
    cssDevSourcemap: false,
    compiler: options.compiler || compiler,
    devToolsEnabled: flags.devToolsEnabled,
    isProduction: !!isProduction,
    ...options,
    features: { ...options.features }
  };

  return {
    name: 'vue',

    setup(build) {
      setVueCompileTimeFlags(build, flags);

      // Only intercept virtual sub-requests so the host resolver (and TS path aliases)
      // handle bare/aliased `.vue` imports.
      build.onResolve({ filter: /\.vue\?.*/ }, (args) => {
        const [filepath, rawQuery = ''] = args.path.split('?', 2);
        const fullPath = path.isAbsolute(filepath)
          ? filepath
          : path.resolve(args.resolveDir, filepath);
        const withQuery = rawQuery ? `${fullPath}?${rawQuery}` : fullPath;

        const { query } = parseVueRequest(withQuery);
        if (!query.vue) return null;

        if (query.type === 'script') {
          return { path: withQuery, namespace: 'sfc-script' };
        }
        if (query.type === 'template') {
          return { path: withQuery, namespace: 'sfc-template' };
        }
        if (query.type === 'style') {
          return { path: withQuery, namespace: 'sfc-style' };
        }
        if (query.type) {
          return { path: withQuery, namespace: 'sfc-custom' };
        }
        return null;
      });

      build.onLoad({ filter: /.*/, namespace: 'sfc-script' }, async (args) => {
        const { filename } = parseVueRequest(args.path);
        const descriptor = getDescriptor(filename, resolved);
        const customElement = matchesCustomElement(
          filename,
          resolved.features?.customElement ?? resolved.customElement
        );
        const script = resolveScript(descriptor, resolved, customElement);

        if (!script) {
          return { contents: 'export default {}', loader: 'js' };
        }

        return {
          contents: script.content,
          loader: script.lang === 'ts' ? 'ts' : 'js'
        };
      });

      build.onLoad(
        { filter: /.*/, namespace: 'sfc-template' },
        async (args) => {
          const { filename } = parseVueRequest(args.path);
          const descriptor = getDescriptor(filename, resolved);
          const customElement = matchesCustomElement(
            filename,
            resolved.features?.customElement ?? resolved.customElement
          );

          if (!descriptor.template) {
            return { contents: 'export const render = () => {}', loader: 'js' };
          }

          if (isUseInlineTemplate(descriptor)) {
            return { contents: 'export const render = () => {}', loader: 'js' };
          }

          const code = await compileTemplateModule(
            descriptor,
            resolved,
            customElement
          );

          return { contents: code, loader: 'js' };
        }
      );

      build.onLoad({ filter: /.*/, namespace: 'sfc-style' }, async (args) => {
        const { filename, query } = parseVueRequest(args.path);
        const descriptor = getDescriptor(filename, resolved);

        const index = query.index ?? 0;
        const css = await compileStyleBlock(descriptor, index, resolved);

        return { contents: css, loader: 'css' };
      });

      build.onLoad({ filter: /.*/, namespace: 'sfc-custom' }, async (args) => {
        const { filename, query } = parseVueRequest(args.path);
        const descriptor = getDescriptor(filename, resolved);
        const block = descriptor.customBlocks[query.index || 0];
        const source = block?.src
          ? fs.readFileSync(
              path.resolve(path.dirname(filename), block.src),
              'utf-8'
            )
          : block?.content || '';
        return { contents: source, loader: block?.lang === 'ts' ? 'ts' : 'js' };
      });

      const loadMain = async (filename: string) => {
        const source = await Bun.file(filename).text();
        const descriptor = getDescriptor(filename, resolved, source);
        const customElement = matchesCustomElement(
          filename,
          resolved.features?.customElement ?? resolved.customElement
        );

        const inlineTemplate = isUseInlineTemplate(descriptor);
        const code = createMainModule(
          descriptor,
          customElement,
          resolved,
          inlineTemplate
        );

        return { contents: code, loader: 'js' as const };
      };

      build.onLoad({ filter: /\.vue$/ }, async (args) => loadMain(args.path));
      build.onLoad({ filter: /.*/, namespace: 'sfc-main' }, async (args) =>
        loadMain(args.path.split('?')[0])
      );

      // Fallback replacement for dev server define handling in Bun
      build.onLoad(
        { filter: /node_modules\/@vue\/(.*)\.js$/ },
        async (args) => {
          const file = Bun.file(args.path);
          let source = await file.text();

          const vueFlags = [
            ['__VUE_PROD_DEVTOOLS__', flags.prodDevtools ? 'true' : 'false'],
            ['__VUE_OPTIONS_API__', flags.optionsAPI ? 'true' : 'false'],
            [
              '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__',
              flags.prodHydrationMismatchDetails ? 'true' : 'false'
            ]
          ];

          for (const [flag, value] of vueFlags) {
            source = source.replaceAll(flag!, value!);
          }

          return { contents: source, loader: 'js' };
        }
      );
    }
  };
}
