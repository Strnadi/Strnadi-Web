import type { BunPlugin } from 'bun';
import { posix } from 'path';

export interface Options {
  /**
   * Layouts directory.
   * @default "src/layouts"
   */
  target?: string;
  /**
   * Default layout name.
   * @default "default"
   */
  defaultLayout?: string;
  /**
   * Import strategy for layouts.
   * @default process.env.VITE_SSG ? "sync" : "async"
   */
  importMode?: 'sync' | 'async';
  /**
   * Skip the top-level route layout produced by unplugin-vue-router.
   * @default false
   */
  skipTopLevelRouteLayout?: boolean;
  /**
   * Glob patterns to exclude from layout discovery.
   */
  excludes?: string[];
  /**
   * Meta field name that stores the layout key.
   * @default "layout"
   */
  metaName?: string;
}

function normalizePath(path: string) {
  const normalized = path.startsWith('/') ? path : '/' + path;
  return posix.normalize(normalized);
}

function createVirtualModuleID(name: string) {
  const virtualModuleId = `virtual:${name}`;
  const resolvedVirtualModuleId = '\0' + virtualModuleId;
  return { virtualModuleId, resolvedVirtualModuleId };
}

type LayoutEntry = {
  absolutePath: string;
  key: string;
};

async function discoverLayouts(target: string, excludes: string[]) {
  const projectRoot = posix.normalize(process.cwd());
  const glob = new Bun.Glob(posix.join(target, '**/*.vue'));
  const excludeGlobs = excludes.map(
    (pattern) => new Bun.Glob(posix.join(target, pattern))
  );
  const targetAbs = normalizePath(posix.join(projectRoot, target));

  const layouts: LayoutEntry[] = [];

  for await (const file of glob.scan({ cwd: projectRoot })) {
    const normalizedRel = posix.normalize(file);
    const shouldExclude = excludeGlobs.some((exclude) =>
      exclude.match(normalizedRel)
    );

    if (shouldExclude) continue;

    const absolutePath = normalizePath(posix.join(projectRoot, normalizedRel));
    const key = absolutePath
      .replace(`${targetAbs}/`, '')
      .replace('.vue', '');

    layouts.push({
      absolutePath,
      key
    });
  }

  return layouts.sort((a, b) => a.key.localeCompare(b.key));
}

function createVirtualModuleCode(options: {
  target: string;
  defaultLayout: string;
  importMode: 'sync' | 'async';
  skipTopLevelRouteLayout: boolean;
  metaName: string;
  layouts: LayoutEntry[];
}) {
  const {
    defaultLayout,
    importMode,
    skipTopLevelRouteLayout,
    metaName,
    layouts
  } = options;
  const isSync = importMode === 'sync';

  const imports = isSync
    ? layouts
        .map(
          (layout, index) =>
            `import __layout${index} from '${layout.absolutePath}';`
        )
        .join('\n')
    : '';

  const layoutEntries = layouts
    .map((layout, index) => {
      const value = isSync
        ? `__layout${index}`
        : `() => import('${layout.absolutePath}')`;
      return `\t"${layout.key}": ${value}`;
    })
    .join(',\n');

  const skipCode = `// unplugin-vue-router adds a top-level route to the routing group, which we should skip. (ref → https://github.com/JohnCampionJr/vite-plugin-vue-layouts/issues/134)
    const skipLayout = !route.component && route.children?.find(r => (r.path === '' || r.path === '/') && r.meta?.isLayout)

    if (skipLayout) {
      return route
    }`;

  return `
${imports}

export function createGetRoutes(router, withLayout = false) {
  const routes = router.getRoutes()
  if (withLayout) {
    return routes
  }
  return () => routes.filter(route => !route.meta.isLayout)
}

export function setupLayouts(routes) {
  const layouts = {
${layoutEntries}
  }

  function deepSetupLayout(routes, top = true) {
    return routes.map(route => {
      if (route.children?.length > 0) {
        route.children = deepSetupLayout(route.children, false)
      }
      
      if (top) {
        ${skipTopLevelRouteLayout ? skipCode : ''}
        if (route.meta?.${metaName} !== false && !route.meta?.isLayout) {
          return {
            path: route.path,
            component: layouts[route.meta?.${metaName} || '${defaultLayout}'],
            // ref → https://github.com/JohnCampionJr/vite-plugin-vue-layouts/pull/97
            children: route.path === '/' ? [route] : [{...route, path: ''}],
            meta: {
              ...route.meta,
              isLayout: true
            }
          }
        }
      }

      if (route.meta?.${metaName} && !route.meta?.isLayout) {
        return { 
          path: route.path,
          component: layouts[route.meta?.${metaName}],
          children: [ {...route, path: ''} ],
          meta: {
            ...route.meta,
            isLayout: true
          }
        }
      }

      return route
    })
  }

  return deepSetupLayout(routes)
}`;
}

export default function MetaLayouts(options: Partial<Options> = {}): BunPlugin {
  const {
    target = 'src/layouts',
    defaultLayout = 'default',
    importMode = process.env.SSG ? 'sync' : 'async',
    skipTopLevelRouteLayout = false,
    excludes = [],
    metaName = 'layout'
  } = options;

  const { virtualModuleId, resolvedVirtualModuleId } =
    createVirtualModuleID('meta-layouts');
  const resolveFilter = new RegExp(
    `^${virtualModuleId}$|^${resolvedVirtualModuleId}$`
  );

  return {
    name: 'bun-plugin-vue-meta-layouts',
    setup(build) {
      build.onResolve({ filter: resolveFilter }, () => ({
        path: virtualModuleId,
        namespace: 'meta-layouts'
      }));

      build.onLoad({ filter: /.*/, namespace: 'meta-layouts' }, async () => ({
        contents: createVirtualModuleCode({
          target,
          importMode,
          defaultLayout,
          skipTopLevelRouteLayout,
          metaName,
          layouts: await discoverLayouts(target, excludes)
        }),
        loader: 'ts'
      }));
    }
  };
}
