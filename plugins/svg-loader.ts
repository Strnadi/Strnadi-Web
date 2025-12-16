import { readFileSync } from "fs";
import { compileTemplate } from "vue/compiler-sfc";
import { optimize as optimizeSvg } from "svgo";
import type { BunPlugin } from "bun";

interface SVGLoaderOptions {
  svgoConfig?: Record<string, unknown>;
  svgo?: boolean;
  defaultImport?: string;
}

export function svgLoader(options: SVGLoaderOptions = {}): BunPlugin {
  const { svgoConfig = {}, svgo = true, defaultImport = "component" } = options;

  const svgRegex = /\.svg(\?(raw|component|skipsvgo))?$/;

  return {
    name: "svg-loader",
    async setup(build) {
      build.onLoad({ filter: svgRegex }, async (args) => {
        const path = args.path;
        const query = new URL(`file://${path}`).searchParams.get("import") || defaultImport;

        if (query === "url") {
          return undefined; // Use default svg loader
        }

        let svg: string;

        try {
          svg = readFileSync(path, "utf-8");
        } catch (ex) {
          console.warn(`\n${path} couldn't be loaded by svg-loader, fallback to default loader`);
          return undefined;
        }

        if (query === "raw") {
          return {
            exports: { default: svg },
            loader: "js",
          };
        }

        if (svgo && query !== "skipsvgo") {
          svg = optimizeSvg(svg, {
            ...svgoConfig,
            path,
          }).data;
        }

        // To prevent compileTemplate from removing the style tag
        svg = svg
          .replace(/<style/g, '<component is="style"')
          .replace(/<\/style/g, "</component");

        const { code } = compileTemplate({
          id: JSON.stringify(path),
          source: svg,
          filename: path,
          transformAssetUrls: false,
        });

        return {
          contents: `${code}\nexport default { render: render }`,
          loader: "js",
        };
      });
    },
  };
}

export default svgLoader;
