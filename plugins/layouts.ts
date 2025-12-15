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

function createVirtualGlob(
  target: string,
  isSync: boolean,
  excludes: string[]
) {
  const excludeGlobs = excludes
    .map((exclude) => `"!${target}/${exclude}"`)
    .join(',');
  const glob =
    excludeGlobs === ''
      ? `"${target}/**/*.vue"`
      : `["${target}/**/*.vue", ${excludeGlobs}]`;

  return `import.meta.glob(${glob}, { eager: ${isSync} })`;
}

function createVirtualModuleCode(options: {
  target: string;
  defaultLayout: string;
  importMode: 'sync' | 'async';
  skipTopLevelRouteLayout: boolean;
  excludes: string[];
  metaName: string;
}) {
  const {
    target,
    defaultLayout,
    importMode,
    skipTopLevelRouteLayout,
    excludes,
    metaName
  } = options;

  const normalizedTarget = normalizePath(target);
  const isSync = importMode === 'sync';

  const skipCode = `// unplugin-vue-router adds a top-level route to the routing group, which we should skip. (ref → https://github.com/JohnCampionJr/vite-plugin-vue-layouts/issues/134)
		const skipLayout = !route.component && route.children?.find(r => (r.path === '' || r.path === '/') && r.meta?.isLayout)

		if (skipLayout) {
			return route
		}`;

  return `
export function createGetRoutes(router, withLayout = false) {
	const routes = router.getRoutes()
	if (withLayout) {
		return routes
	}
	return () => routes.filter(route => !route.meta.isLayout)
}

export function setupLayouts(routes) {
	const layouts = {}

	const modules = ${createVirtualGlob(normalizedTarget, isSync, excludes)}

	Object.entries(modules).forEach(([name, module]) => {
		let key = name.replace("${normalizedTarget}/", '').replace('.vue', '')
		layouts[key] = ${isSync ? 'module.default' : 'module'}
	})

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
    importMode = process.env.VITE_SSG ? 'sync' : 'async',
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
          excludes,
          metaName
        }),
        loader: 'ts'
      }));
    }
  };
}
