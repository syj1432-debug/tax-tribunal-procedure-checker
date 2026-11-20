// 시험 설정
// "server-only"는 브라우저 쪽 코드에서 불러오면 빌드를 막는 안전장치다. 시험은 서버 쪽에서 도니 빈 파일로 대신한다.

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
    },
  },
});
