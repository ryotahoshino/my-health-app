import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { printSchema } from "graphql";
import { builder } from "../src/schema/builder.js";
import "../src/schema/health.js";

// Pothos(code-first)定義から SDL を導出するビルド時スクリプト(research.md #3)。
// この apps/server/schema.graphql はクライアントのGraphQL Code Generatorの
// 入力元としてのみ使う副産物であり、手書き・手動編集はしない(憲法 原則IV)。
const schema = builder.toSchema();
const outputPath = fileURLToPath(new URL("../schema.graphql", import.meta.url));
writeFileSync(outputPath, printSchema(schema));
console.log(`Wrote ${outputPath}`);
