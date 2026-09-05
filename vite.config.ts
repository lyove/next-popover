import * as path from "path";
import { defineConfig } from "vite";
import banner from "vite-plugin-banner";
import styleInject from "./plugins/style-inject";
import packageJson from "./package.json";

const packageName = packageJson.name;
const outputName = "popover";

const getPascalCaseName = () => {
  try {
    return packageName
      .replace(new RegExp(/[-_]+/, "g"), " ")
      .replace(new RegExp(/[^\w\s]/, "g"), "")
      .replace(
        new RegExp(/\s+(.)(\w+)/, "g"),
        ($1, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`,
      )
      .replace(new RegExp(/\s/, "g"), "")
      .replace(new RegExp(/\w/), (s) => s.toUpperCase());
  } catch (err) {
    throw new Error("Name property in package.json is missing.");
  }
};

const fileName = {
  es: `${outputName}.es.js`,
  umd: `${outputName}.umd.js`,
  iife: `${outputName}.iife.js`,
};

const pkgInfo = `/**
 * name: ${packageJson.name}
 * version: ${packageJson.version}
 * description: ${packageJson.description}
 * author: ${packageJson.author}
 * homepage: ${packageJson.homepage}
 * repository: ${packageJson.repository.url}
 */`;

export default defineConfig(({ command, mode }) => {
  return {
    base: "./",
    server: {
      port: 8080,
      https: false,
      open: true,
      hmr: {
        overlay: false,
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        name: getPascalCaseName(),
        formats: ["es", "umd", "iife"],
        fileName: (format) => fileName[format],
      },
      rollupOptions: {
        output: {
          exports: "named",
        },
      },
      copyPublicDir: false,
    },
    plugins: [banner(pkgInfo), styleInject({ styleId: "next-popover-style" })],
    resolve: {
      alias: {
        "@/*": path.resolve(__dirname, "src"),
      },
    },
  };
});
