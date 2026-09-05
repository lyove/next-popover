const outputName = "popover";

const config = {
  compilationOptions: {
    preferredConfigPath: "./tsconfig.dts.json",
  },
  entries: [
    {
      filePath: "./src/index.ts",
      outFile: `./dist/${outputName}.es.d.ts`,
      output: {
        noBanner: true,
      },
    },
  ],
};

module.exports = config;
