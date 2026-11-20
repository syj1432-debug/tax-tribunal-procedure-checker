// 실제 AI를 부르는 전체 흐름 시험 설정 (npm run test:live)
// 평소 시험(npm test)에는 들어가지 않는다. 개발 서버(npm run dev)가 켜져 있어야 한다.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)) } },
  test: { include: ["tests/live/**/*.live.ts"], testTimeout: 300_000, fileParallelism: false },
});
