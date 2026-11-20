// 보안 보강 시험 (CHECK.md G4·G7·G8)
// Design Ref: §4 — 보안
// Plan SC: PLAN 성공 기준 4·6번
//
// 실행: npm test

import { describe, expect, it } from "vitest";

import { AI읽은값수 } from "../lib/extract/fields";
import { 같은사이트요청인가 } from "../lib/server/origin";
import { 내용형식맞음, 최대글자수 } from "../lib/upload";
import type { 사건정보 } from "../lib/types";

const 바이트 = (...값: number[]) => new Uint8Array(값);

describe("같은사이트요청인가", () => {
  const 헤더 = (값: Record<string, string>) => new Headers(값);
  it("같은 사이트에서 온 요청은 통과", () => {
    expect(같은사이트요청인가(헤더({ origin: "https://my.app", host: "my.app" }))).toBe(true);
    expect(같은사이트요청인가(헤더({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });
  it("다른 사이트의 Origin이면 거부", () => {
    expect(같은사이트요청인가(헤더({ origin: "https://evil.example", host: "my.app" }))).toBe(false);
  });
  it("Sec-Fetch-Site가 cross-site면 거부", () => {
    expect(같은사이트요청인가(헤더({ "sec-fetch-site": "cross-site", host: "my.app" }))).toBe(false);
  });
  it("Origin이 없는(브라우저 밖) 호출은 여기서 통과 — 다른 장치(OpenAI 한도 등)로 막는다", () => {
    expect(같은사이트요청인가(헤더({ host: "my.app" }))).toBe(true);
  });
  it("Origin이 이상한 글이면 거부", () => {
    expect(같은사이트요청인가(헤더({ origin: "not-a-url", host: "my.app" }))).toBe(false);
  });
  it("프록시 뒤에서는 x-forwarded-host를 기준으로 본다", () => {
    expect(
      같은사이트요청인가(헤더({ origin: "https://my.app", host: "internal", "x-forwarded-host": "my.app" })),
    ).toBe(true);
  });
});

describe("내용형식맞음 (확장자만 바꾼 파일 거르기)", () => {
  it("PDF는 %PDF-로 시작해야 한다", () => {
    expect(내용형식맞음("a.pdf", 바이트(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31))).toBe(true);
    expect(내용형식맞음("a.PDF", 바이트(0x4d, 0x5a, 0x90))).toBe(false); // 실행 파일 모양
  });
  it("JPG는 FF D8 FF로 시작해야 한다", () => {
    expect(내용형식맞음("a.jpg", 바이트(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(내용형식맞음("a.jpeg", 바이트(0x89, 0x50, 0x4e))).toBe(false); // PNG
  });
  it("DOCX는 PK로 시작해야 한다", () => {
    expect(내용형식맞음("a.docx", 바이트(0x50, 0x4b, 0x03, 0x04))).toBe(true);
    expect(내용형식맞음("a.docx", 바이트(0x25, 0x50, 0x44, 0x46))).toBe(false);
  });
  it("빈 내용은 모두 틀리다고 본다", () => {
    expect(내용형식맞음("a.pdf", 바이트())).toBe(false);
  });
  it("글자 수 한도는 20만 자다", () => {
    expect(최대글자수).toBe(200_000);
  });
});

describe("AI읽은값수 (결과 화면 경고용)", () => {
  it("읽어 채웠고 고치지 않은 값만 센다", () => {
    const 정보: 사건정보 = {
      모드: "가상",
      청구인: "김가상",
      처분청: "가상세무서",
      접수일: "2026-06-18",
      출처: { 청구인: { 파일명: "a.pdf" }, 처분청: { 파일명: "a.pdf" }, 접수일: { 파일명: "b.pdf" } },
      사용자수정: ["처분청"],
    };
    expect(AI읽은값수(정보)).toBe(2); // 처분청은 고쳤으니 제외
  });
  it("값을 지운 칸이나 출처가 없는 직접 입력은 세지 않는다", () => {
    expect(AI읽은값수({ 모드: "실제", 청구인: "김가상" })).toBe(0);
    expect(AI읽은값수({ 모드: "가상", 청구인: null, 출처: { 청구인: { 파일명: "a.pdf" } } })).toBe(0);
  });
});
