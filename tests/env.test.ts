// API 키 서버 전용 읽기 시험
// Design Ref: §4 — API 키는 서버 코드로만 읽고 NEXT_PUBLIC_ 접두사를 쓰지 않는다.
// Plan SC: PLAN 작업 12번
//
// 실행: npm test

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AI키있음, AI키읽기 } from "../lib/server/env";

afterEach(() => vi.unstubAllEnvs());

describe("AI키읽기", () => {
  it("환경변수에 값이 있으면 읽는다 (앞뒤 공백은 뗀다)", () => {
    vi.stubEnv("OPENAI_API_KEY", "  시험용-가짜-키 ");
    expect(AI키읽기()).toBe("시험용-가짜-키");
    expect(AI키있음()).toBe(true);
  });
  it("없거나 비어 있으면 null이다", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(AI키읽기()).toBeNull();
    expect(AI키있음()).toBe(false);
    vi.stubEnv("OPENAI_API_KEY", "   ");
    expect(AI키읽기()).toBeNull();
  });
});

function 소스파일들(폴더: string): string[] {
  return readdirSync(폴더).flatMap((이름) => {
    const 경로 = join(폴더, 이름);
    if (statSync(경로).isDirectory()) return 소스파일들(경로);
    return /\.(ts|tsx)$/.test(이름) ? [경로] : [];
  });
}
const 정리 = (경로: string) => 경로.replace(/\\/g, "/");
const 모든소스 = ["app", "components", "lib"].flatMap(소스파일들);

describe("키 노출 방지 규칙", () => {
  it("OPENAI_API_KEY는 lib/server/env.ts 한 곳에서만 쓴다", () => {
    const 쓴곳 = 모든소스
      .filter((p) => readFileSync(p, "utf8").includes("OPENAI_API_KEY"))
      .map(정리);
    expect(쓴곳).toEqual(["lib/server/env.ts"]);
  });
  it("NEXT_PUBLIC_ 접두사를 쓰는 곳이 없다 (브라우저로 값이 나가지 않게)", () => {
    const 쓴곳 = 모든소스.filter((p) => readFileSync(p, "utf8").includes("NEXT_PUBLIC_")).map(정리);
    expect(쓴곳).toEqual([]);
  });
  it("lib/server 파일은 맨 위에서 server-only를 불러온다", () => {
    for (const p of 모든소스.filter((p) => 정리(p).startsWith("lib/server/"))) {
      expect(readFileSync(p, "utf8")).toMatch(/import\s+["']server-only["']/);
    }
  });
  it("브라우저 쪽 코드(components, use client 파일)는 lib/server를 불러오지 않는다", () => {
    const 브라우저쪽 = 모든소스.filter(
      (p) => 정리(p).startsWith("components/") || /^\s*["']use client["']/.test(readFileSync(p, "utf8")),
    );
    const 어긴곳 = 브라우저쪽.filter((p) => /lib\/server|server\/env/.test(readFileSync(p, "utf8"))).map(정리);
    expect(어긴곳).toEqual([]);
  });
  it(".gitignore가 .env를 막고 있다", () => {
    expect(readFileSync(".gitignore", "utf8")).toMatch(/^\.env\*?$/m);
  });
});
