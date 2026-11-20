import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 삭제 대기 폴더(사용자가 확인 후 지운다)는 검사하지 않는다. (CLAUDE.md 파일 삭제 규칙)
    "trash-can/**",
  ]),
]);

export default eslintConfig;
