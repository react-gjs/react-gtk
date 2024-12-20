const { build } = require("@ncpa0cpl/nodepack");
const { toJsonSchema, toTsType, getMetadata } = require("dilswer");
const path = require("path");
const fs = require("fs/promises");

const p = (loc) => path.resolve(__dirname, "..", loc);

async function main() {
  try {
    await Promise.all([
      // Build main package
      await build({
        target: "es2020",
        srcDir: p("src"),
        outDir: p("dist"),
        tsConfig: p("tsconfig.json"),
        formats: ["cjs", "esm", "legacy"],
        declarations: true,
        exclude: [/\/polyfills\//, /\/runtime\//],
        isomorphicImports: {
          "./config/eval-js-config/eval-js-config.ts": {
            js: "./config/eval-js-config/eval-js-config.cjs.ts",
            cjs: "./config/eval-js-config/eval-js-config.cjs.ts",
            mjs: "./config/eval-js-config/eval-js-config.esm.ts",
          },
          "./get-dirpath/get-dirpath.ts": {
            js: "./get-dirpath/get-dirpath.cjs.ts",
            cjs: "./get-dirpath/get-dirpath.cjs.ts",
            mjs: "./get-dirpath/get-dirpath.esm.ts",
          },
        },
      }),
      // Build polyfill packages
      await build({
        target: "ESNext",
        srcDir: p("src/polyfills"),
        outDir: p("polyfills"),
        tsConfig: p("tsconfig.json"),
        formats: ["esm"],
        exclude: [/\.d\.ts$/, /index.ts/, /\.json$/],
      }),
      // Build polyfill packages
      await build({
        target: "ESNext",
        srcDir: p("src/runtime"),
        outDir: p("runtime"),
        tsConfig: p("tsconfig.json"),
        formats: ["esm"],
        exclude: [/\.d\.ts$/, /index.ts/, /\.json$/],
      }),
    ]);

    const { ConfigSchema } = require(p("dist/cjs/config/config-schema.cjs"));

    const configJsonSchema = toJsonSchema(ConfigSchema, {
      additionalProperties: false,
      incompatibleTypes: "omit",
    });

    await fs.writeFile(
      p("dist/config-schema.json"),
      JSON.stringify(configJsonSchema, null, 2),
    );

    const configTsType = toTsType(ConfigSchema, {
      mode: "named-expanded",
      onDuplicateName: "rename",
      declaration: true,
      getExternalTypeImport: (type) => {
        const metadata = getMetadata(type);
        if (metadata.extra && metadata.extra.extraType === "external-import") {
          return metadata.extra;
        }
        if (metadata.extra && metadata.extra.typeDef) {
          return {
            typeName: metadata.extra.typeDef,
          };
        }
      },
    });

    await fs.writeFile(p("dist/types/config/config-type.d.ts"), configTsType);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
