import { type Options, defineConfig } from "tsup";
import { copy } from "esbuild-plugin-copy";

const commonConfig: Options = {
    // entry: ["./src/*.ts"],
    outDir: "dist",
    clean: true,
    sourcemap: true,
    treeshake: true,
    esbuildPlugins: [
        copy({
            assets: {
                // TODO: LICENSE
                from: ["./package.json", "./README.md"],
                to: ["./package.json", "./README.md"],
            },
            watch: true,
        }),
    ],
};

export default defineConfig((options) => [
    {
        ...commonConfig,
        entry: ["./src/index.node.ts"],
        format: ["cjs", "esm"],
        platform: "node",
        dts: options.dts,
        target: "node16.14",
    },
    {
        ...commonConfig,
        entry: ["./src/index.ts"],
        format: ["iife"],
        globalName: "Nomland",
        minify: !options.watch,
        platform: "browser",
        dts: false,
        target: "es2020",
    },
]);
