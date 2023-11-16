import { type Options, defineConfig } from "tsup";

const commonConfig: Options = {
    // entry: ["./src/*.ts"],
    outDir: "dist",
    clean: true,
    sourcemap: true,
    treeshake: true,
};

export default defineConfig((options) => [
    {
        ...commonConfig,
        entry: ["./src/index.node.ts"],
        format: ["cjs", "esm"],
        outDir: "dist/node",
        platform: "node",
        dts: true,
        target: "node16.14",
    },
    {
        ...commonConfig,
        entry: ["./src/index.ts"],
        format: ["iife"],
        outDir: "dist/browser",
        outExtension: () => {
            return {
                js: ".browser.js",
                dts: ".browser.d.ts",
            };
        },
        globalName: "Nomland",
        minify: !options.watch,
        platform: "browser",
        dts: options.dts,
        target: "es2020",
        env: {
            NODE_ENV: "production",
        },
        define: {
            "process.env.NODE_ENV": '"production"',
        },
    },
]);
