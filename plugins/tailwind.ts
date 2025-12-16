import {
	compile,
	env,
	Features,
	Instrumentation,
	normalizePath,
	optimize,
	toSourceMap
} from '@tailwindcss/node';
import { clearRequireCache } from '@tailwindcss/node/require-cache';
import { Scanner } from '@tailwindcss/oxide';
import type { BunPlugin } from 'bun';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const DEBUG = env.DEBUG;
const SPECIAL_QUERY_RE = /[?&](?:worker|sharedworker|raw|url)\b/;
const COMMON_JS_PROXY_RE = /\?commonjs-proxy/;
const INLINE_STYLE_ID_RE = /[?&]index\=\d+\.css$/;
const CSS_FILTER = /\.css(?:\?.*)?$|&lang\.css|[?&]index\=\d+\.css$/;

export type PluginOptions = {
	optimize?: boolean | { minify?: boolean };
};

export default function tailwindcss(opts: PluginOptions = {}): BunPlugin {
	const roots = new Map<string, Root>();

	let rootDir = process.cwd();
	let enableSourceMaps = false;
	let shouldOptimize = true;
	let minify = true;
	let isProductionBuild = process.env.NODE_ENV === 'production';

	return {
		name: '@tailwindcss/bun',
		setup(build) {
			rootDir = (build as any)?.config?.root ?? process.cwd();
			enableSourceMaps = Boolean((build as any)?.config?.sourcemap);

			const buildMinify = (build as any)?.config?.minify;
			isProductionBuild =
				typeof buildMinify === 'boolean'
					? buildMinify
					: process.env.NODE_ENV === 'production';

			if (opts.optimize !== undefined) {
				shouldOptimize = opts.optimize !== false;
			}

			minify = shouldOptimize && isProductionBuild;
			if (typeof opts.optimize === 'object') {
				minify = opts.optimize.minify !== false;
			}

			const resolveCss = createResolver({ extensions: ['.css'], preferStyle: true });
			const resolveJs = createResolver({
				extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx', '.json']
			});

			build.onLoad({ filter: CSS_FILTER }, async (args) => {
				if (!isPotentialCssRootFile(args.path)) return;

				// console.log(`[Tailwind] Loading: ${args.path}`);

				const I = new Instrumentation();
				DEBUG && I.start('[@tailwindcss/bun] Generate CSS');

				const root = roots.get(args.path) ??
					new Root(args.path, rootDir, enableSourceMaps, resolveCss, resolveJs);
				roots.set(args.path, root);

				const watchFiles = new Set<string>();
				const source = await Bun.file(idToPath(args.path)).text();

				let result = await root.generate(source, (file) => watchFiles.add(file), I);
				if (!result) {
					// console.log(`[Tailwind] Skipped (no features): ${args.path}`);
					roots.delete(args.path);
					return { contents: source, loader: 'css' };
				}
				
				// console.log(`[Tailwind] Generated: ${args.path}`);

				DEBUG && I.end('[@tailwindcss/bun] Generate CSS');

				if (shouldOptimize && isProductionBuild) {
					DEBUG && I.start('[@tailwindcss/bun] Optimize CSS');
					result = optimize(result.code, { minify, map: result.map });
					DEBUG && I.end('[@tailwindcss/bun] Optimize CSS');
				}

				const contents = withInlineSourceMap(result.code, result.map);

				return {
					contents,
					loader: 'css',
					resolveDir: path.dirname(idToPath(args.path)),
					watchFiles: Array.from(watchFiles)
				};
			});
		}
	};
}




function getExtension(id: string) {
	const [filename] = id.split('?', 2);
	return path.extname(filename).slice(1);
}

function isPotentialCssRootFile(id: string) {
	if (id.includes('/.vite/')) return false;

	if (SPECIAL_QUERY_RE.test(id)) return false;
	if (COMMON_JS_PROXY_RE.test(id)) return false;

	const extension = getExtension(id);
	const isCssFile = extension === 'css' || id.includes('&lang.css') || id.match(INLINE_STYLE_ID_RE);

	return isCssFile;
}

function idToPath(id: string) {
	return path.resolve(id.replace(/\?.*$/, ''));
}

class Root {
	private compiler?: Awaited<ReturnType<typeof compile>>;
	private scanner?: Scanner;
	private candidates: Set<string> = new Set<string>();
	private buildDependencies = new Map<string, number | null>();

	constructor(
		private id: string,
		private base: string,
		private enableSourceMaps: boolean,
		private customCssResolver: (id: string, base: string) => Promise<string | false | undefined>,
		private customJsResolver: (id: string, base: string) => Promise<string | false | undefined>
	) {}

	public async generate(
		content: string,
		_addWatchFile: (file: string) => void,
		I: Instrumentation
	): Promise<
		| {
				code: string;
				map: string | undefined;
			}
		| false
	> {
		const inputPath = idToPath(this.id);

		const addWatchFile = (file: string) => {
			if (file === inputPath) {
				return;
			}

			if (/[\#\?].*\.svg$/.test(file)) {
				return;
			}

			_addWatchFile(file);
		};

		const requiresBuildPromise = this.requiresBuild();
		const inputBase = path.dirname(path.resolve(inputPath));

		if (!this.compiler || !this.scanner || (await requiresBuildPromise)) {
			clearRequireCache(Array.from(this.buildDependencies.keys()));
			this.buildDependencies.clear();

			this.addBuildDependency(idToPath(inputPath));

			DEBUG && I.start('Setup compiler');
			const addBuildDependenciesPromises: Promise<void>[] = [];
			this.compiler = await compile(content, {
				from: this.enableSourceMaps ? this.id : undefined,
				base: inputBase,
				shouldRewriteUrls: true,
				onDependency: (dependencyPath) => {
					addWatchFile(dependencyPath);
					addBuildDependenciesPromises.push(this.addBuildDependency(dependencyPath));
				},
				customCssResolver: this.customCssResolver,
				customJsResolver: this.customJsResolver
			});
			await Promise.all(addBuildDependenciesPromises);
			DEBUG && I.end('Setup compiler');

			DEBUG && I.start('Setup scanner');

			const sources = (() => {
				if (this.compiler!.root === 'none') {
					return [] as { base: string; pattern: string; negated: boolean }[];
				}

				if (this.compiler!.root === null) {
					return [{ base: this.base, pattern: '**/*', negated: false }];
				}

				return [{ ...(this.compiler!.root as any), negated: false }];
			})().concat(this.compiler!.sources);

			this.scanner = new Scanner({ sources });
			DEBUG && I.end('Setup scanner');
		} else {
			for (const buildDependency of this.buildDependencies.keys()) {
				addWatchFile(buildDependency);
			}
		}

		if (
			!(
				this.compiler!.features &
				(Features.AtApply | Features.JsPluginCompat | Features.ThemeFunction | Features.Utilities)
			)
		) {
			return false;
		}

		if (this.compiler!.features & Features.Utilities) {
			DEBUG && I.start('Scan for candidates');
			for (const candidate of this.scanner!.scan()) {
				this.candidates.add(candidate);
			}
			DEBUG && I.end('Scan for candidates');
		}

		if (this.compiler!.features & Features.Utilities) {
			for (const file of this.scanner!.files) {
				addWatchFile(file);
			}

			for (const glob of this.scanner!.globs) {
				if (glob.pattern[0] === '!') continue;

				let relative = path.relative(this.base, glob.base);
				if (relative[0] !== '.') {
					relative = './' + relative;
				}
				relative = normalizePath(relative);

				addWatchFile(path.posix.join(relative, glob.pattern));

				const root = this.compiler!.root;

				if (root !== 'none' && root !== null) {
					const basePath = normalizePath(path.resolve(root.base, root.pattern));

					const isDir = await fs.stat(basePath).then(
						(stats) => stats.isDirectory(),
						() => false
					);

					if (!isDir) {
						throw new Error(
							`The path given to \`source(…)\` must be a directory but got \`source(${basePath})\` instead.`
						);
					}
				}
			}
		}

		DEBUG && I.start('Build CSS');
		const code = this.compiler!.build([...this.candidates]);
		DEBUG && I.end('Build CSS');

		DEBUG && I.start('Build Source Map');
		const map = this.enableSourceMaps ? toSourceMap(this.compiler!.buildSourceMap()).raw : undefined;
		DEBUG && I.end('Build Source Map');

		return {
			code,
			map
		};
	}

	private async addBuildDependency(dependencyPath: string) {
		let mtime: number | null = null;
		try {
			mtime = (await fs.stat(dependencyPath)).mtimeMs;
		} catch {}
		this.buildDependencies.set(dependencyPath, mtime);
	}

	private async requiresBuild(): Promise<boolean> {
		for (const [dependencyPath, mtime] of this.buildDependencies) {
			if (mtime === null) return true;
			try {
				const stat = await fs.stat(dependencyPath);
				if (stat.mtimeMs > mtime) {
					return true;
				}
			} catch {
				return true;
			}
		}
		return false;
	}
}

function withInlineSourceMap(code: string, map?: string) {
	if (!map) return code;
	const base64 = Buffer.from(map).toString('base64');
	return `${code}\n/*# sourceMappingURL=data:application/json;base64,${base64} */`;
}

async function fileExists(candidate: string) {
	try {
		await fs.access(candidate);
		return true;
	} catch {
		return false;
	}
}

function stripQuery(id: string) {
	return id.replace(/[?#].*$/, '');
}

async function resolveWithExtensions(
	target: string,
	extensions: string[]
): Promise<string | undefined> {
	const cleaned = stripQuery(target);
	if (await fileExists(cleaned)) return cleaned;

	for (const ext of extensions) {
		const withExt = cleaned.endsWith(ext) ? cleaned : `${cleaned}${ext}`;
		if (await fileExists(withExt)) return withExt;

		const indexCandidate = path.join(cleaned, `index${ext}`);
		if (await fileExists(indexCandidate)) return indexCandidate;
	}

	return undefined;
}

function createResolver(options: { extensions: string[]; preferStyle?: boolean }) {
	const { extensions, preferStyle = false } = options;

	return async (id: string, base: string): Promise<string | false | undefined> => {
		// console.log(`[Tailwind] Resolving: ${id} from ${base}`);
		const importerDir = path.dirname(idToPath(base));
		const specifier = stripQuery(id);

		const tryResolve = async (candidate: string) => resolveWithExtensions(candidate, extensions);

		if (specifier.startsWith('file://')) {
			const filePath = fileURLToPath(new URL(specifier));
			return (await tryResolve(filePath)) ?? false;
		}

		if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('..')) {
			const absolute = path.resolve(importerDir, specifier);
			return (await tryResolve(absolute)) ?? false;
		}

		try {
			const pkgJson = require.resolve(path.join(specifier, 'package.json'), {
				paths: [importerDir]
			});
			const pkgDir = path.dirname(pkgJson);
			const pkg = JSON.parse(await fs.readFile(pkgJson, 'utf8')) as Record<string, any>;

			const fields = preferStyle
				? ['style', 'module', 'main']
				: ['module', 'main'];

			for (const field of fields) {
				const entry = pkg[field];
				if (!entry) continue;
				const candidate = path.resolve(pkgDir, entry);
				const resolved = await tryResolve(candidate);
				if (resolved) return resolved;
			}

			if (pkg.exports && typeof pkg.exports === 'object') {
				const possible = pkg.exports['.'] || pkg.exports['import'];
				if (typeof possible === 'string') {
					const candidate = path.resolve(pkgDir, possible);
					const resolved = await tryResolve(candidate);
					if (resolved) return resolved;
				}
			}
		} catch {}

		try {
			const resolved = require.resolve(specifier, { paths: [importerDir] });
			const withExt = await tryResolve(resolved);
			if (withExt) return withExt;
			return resolved;
		} catch {}

		return false;
	};
}
