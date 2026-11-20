// 식별번호 가리기와 로그 규칙 시험
// Design Ref: §4 — 마스킹, 로그에 서류 내용 금지
// Plan SC: PLAN 작업 10번
//
// 실행: npm test

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { 마스킹, 마스킹또는없음 } from "../lib/mask";
import { 전체점검 } from "../lib/rules";

describe("마스킹", () => {
  it("주민등록번호(하이픈)를 가린다", () => {
    const 결과 = 마스킹("청구인 김가상(900101-1234567)");
    expect(결과).not.toContain("900101");
    expect(결과).not.toContain("1234567");
    expect(결과).toContain("[식별번호 가림]");
  });
  it("하이픈이 없거나 공백이 있어도 가린다", () => {
    expect(마스킹("9001011234567")).toBe("[식별번호 가림]");
    expect(마스킹("900101 1234567")).toBe("[식별번호 가림]");
  });
  it("사업자등록번호를 가린다", () => {
    expect(마스킹("사업자 123-45-67890")).toBe("사업자 [식별번호 가림]");
  });
  it("한 글 안의 번호 여러 개를 모두 가린다", () => {
    expect(마스킹("900101-1234567, 123-45-67890")).toBe("[식별번호 가림], [식별번호 가림]");
  });
  it("날짜·금액·일반 글은 건드리지 않는다", () => {
    for (const 글 of ["2026-03-10", "25000000", "가상세무서", "2026-03-10(화)", "50,000,000원"]) {
      expect(마스킹(글)).toBe(글);
    }
  });
  it("더 긴 숫자의 일부는 가리지 않는다", () => {
    // 14자리 이상 이어진 숫자는 주민등록번호 모양이 아니다.
    expect(마스킹("12345678901234")).toBe("12345678901234");
  });
  it("비어 있는 값은 그대로 돌려준다", () => {
    expect(마스킹또는없음(null)).toBeNull();
    expect(마스킹또는없음(undefined)).toBeUndefined();
    expect(마스킹또는없음("")).toBe("");
  });
});

describe("점검 결과 글에 번호가 섞이면 가릴 수 있다", () => {
  it("청구인 칸에 주민등록번호가 섞여 있어도 결과 근거를 가리면 번호가 안 보인다", () => {
    const 목록 = 전체점검({ 모드: "실제", 청구인: "김가상 900101-1234567", 처분상대방: "이다름" });
    const 보이는글 = 목록.map((c) => 마스킹(c.근거)).join("\n");
    expect(보이는글).not.toContain("1234567");
  });
});

// ── 로그 규칙: console은 lib/log.ts에서만 쓴다 ──
function 소스파일들(폴더: string): string[] {
  return readdirSync(폴더).flatMap((이름) => {
    const 경로 = join(폴더, 이름);
    if (statSync(경로).isDirectory()) return 소스파일들(경로);
    return /\.(ts|tsx)$/.test(이름) ? [경로] : [];
  });
}

describe("로그 규칙", () => {
  it("lib/log.ts 말고는 console을 쓰지 않는다 (서류 내용이 로그에 새지 않게)", () => {
    const 쓴곳 = ["app", "components", "lib"]
      .flatMap(소스파일들)
      .filter((경로) => !경로.replace(/\\/g, "/").endsWith("lib/log.ts"))
      .filter((경로) => /\bconsole\s*\./.test(readFileSync(경로, "utf8")));
    expect(쓴곳).toEqual([]);
  });
});
