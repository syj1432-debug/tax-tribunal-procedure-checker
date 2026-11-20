// 업로드 파일 검사 시험
// Design Ref: §2-2 — 형식·크기를 업로드 전에 검사
// Plan SC: PLAN 작업 13번
//
// 실행: npm test

import { describe, expect, it } from "vitest";

import { 크기글, 파일검사, 파일크기한도 } from "../lib/upload";

describe("형식", () => {
  it("PDF·HWP·Word·JPG는 통과한다 (대문자 확장자도)", () => {
    for (const 이름 of ["청구서.pdf", "a.HWP", "b.doc", "c.docx", "d.jpg", "e.JPEG"]) {
      expect(파일검사({ name: 이름, size: 1000 }).통과).toBe(true);
    }
  });
  it("그 밖의 형식은 안내와 함께 막는다", () => {
    for (const 이름 of ["a.png", "b.exe", "c.zip", "확장자없음"]) {
      const 결과 = 파일검사({ name: 이름, size: 1000 });
      expect(결과.통과).toBe(false);
      if (!결과.통과) expect(결과.이유).toContain("PDF, HWP, Word, JPG");
    }
  });
  it("이름 중간의 점이나 확장자 흉내는 속지 않는다", () => {
    expect(파일검사({ name: "pdf", size: 1000 }).통과).toBe(false);
    expect(파일검사({ name: "청구서.pdf.exe", size: 1000 }).통과).toBe(false);
  });
});

describe("크기", () => {
  it("한도와 같으면 통과, 1바이트라도 넘으면 막는다", () => {
    expect(파일검사({ name: "a.pdf", size: 파일크기한도 }).통과).toBe(true);
    const 결과 = 파일검사({ name: "a.pdf", size: 파일크기한도 + 1 });
    expect(결과.통과).toBe(false);
    if (!결과.통과) expect(결과.이유).toContain("너무 커서 가상 서류로는 올릴 수 없어요");
  });
  it("빈 파일은 막는다", () => {
    expect(파일검사({ name: "a.pdf", size: 0 }).통과).toBe(false);
  });
  it("크기를 읽기 쉬운 글로 보여준다", () => {
    expect(크기글(500)).toBe("500B");
    expect(크기글(2_500)).toBe("3KB");
    expect(크기글(4_500_000)).toBe("4.5MB");
  });
});
