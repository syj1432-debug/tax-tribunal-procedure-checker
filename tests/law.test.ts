// 근거 조문 파일과 붙이기 시험
// Design Ref: §2-3 — 조문 파일에 있는 조문만 붙이고, 없으면 "조문 확인 필요"
// Plan SC: PLAN 작업 16번
//
// 실행: npm test

import { describe, expect, it } from "vitest";

import 시험 from "../samples/시험사례.json";
import { 조문목록 } from "../lib/law/articles";
import { 근거조문붙이기 } from "../lib/law/attach";
import { 전체점검 } from "../lib/rules";
import type { 사건정보, 점검결과 } from "../lib/types";

const 결과 = (항목: 점검결과["항목"], 상태: 점검결과["상태"]): 점검결과 => ({ 항목, 상태, 상태뜻: "", 근거: "" });

describe("조문 파일", () => {
  it("조문마다 원문·주소·확인 날짜가 있다", () => {
    for (const [이름, 조문] of Object.entries(조문목록)) {
      expect(조문.원문.length, 이름).toBeGreaterThan(50);
      expect(조문.주소, 이름).toMatch(/^https:\/\/www\.law\.go\.kr\//);
      expect(조문.확인날짜, 이름).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("원문이 해당 조문 제목으로 시작한다 (엉뚱한 조문이 들어가지 않게)", () => {
    for (const [이름, 조문] of Object.entries(조문목록)) {
      const 조번호 = 이름.replace(/^.* (제\d+조(?:의\d+)?)$/, "$1");
      expect(조문.원문.startsWith(`${조번호}(`), 이름).toBe(true);
    }
  });
  it("아직 못 담은 민법 제157조는 파일에 없다 (기억으로 채우지 않는다)", () => {
    expect("민법 제157조" in 조문목록).toBe(false);
  });
});

describe("근거 조문 붙이기", () => {
  it("대리인 미충족에는 제59조 원문이 붙고 조문 확인 필요는 꺼진다", () => {
    const 붙음 = 근거조문붙이기({ ...결과("대리인부적격", "미충족"), 조문확인필요: true });
    expect(붙음.근거조문?.map((c) => c.이름)).toContain("국세기본법 제59조");
    expect(붙음.근거조문?.[0].원문).toContain("대리인");
    expect(붙음.조문확인필요).toBeUndefined();
  });
  it("청구기간 미충족에는 담은 조문이 붙고, 파일에 없는 민법 제157조는 조문 확인 필요로 남는다", () => {
    const 붙음 = 근거조문붙이기(결과("청구기간", "미충족"));
    expect(붙음.근거조문?.map((c) => c.이름)).toEqual(
      expect.arrayContaining(["국세기본법 제68조", "국세기본법 제5조", "국세기본법 제65조"]),
    );
    expect(붙음.조문확인필요).toBe(true);
    expect(붙음.확인필요조문).toEqual(["민법 제157조"]);
  });
  it("처분 부존재 미충족에는 제55조가 붙는다", () => {
    expect(근거조문붙이기(결과("처분부존재", "미충족")).근거조문?.[0].이름).toBe("국세기본법 제55조");
  });
  it("청구인 판단 필요에는 제55조가 붙는다 (예외 기준)", () => {
    expect(근거조문붙이기(결과("청구인부적격", "판단 필요")).근거조문?.[0].이름).toBe("국세기본법 제55조");
  });
  it("충족·확인 필요에는 조문을 붙이지 않는다", () => {
    for (const 상태 of ["충족", "확인 필요"] as const) {
      const 붙음 = 근거조문붙이기(결과("청구기간", 상태));
      expect(붙음.근거조문).toBeUndefined();
    }
  });
  it("원래 결과 객체는 바꾸지 않는다", () => {
    const 원래 = 결과("대리인부적격", "미충족");
    근거조문붙이기(원래);
    expect(원래.근거조문).toBeUndefined();
  });
  it("조문 원문을 고쳐도 파일의 원문이 바뀌지 않는다 (복사본을 붙인다)", () => {
    const 붙음 = 근거조문붙이기(결과("대리인부적격", "미충족"));
    붙음.근거조문![0].원문 = "바꿈";
    expect(조문목록["국세기본법 제59조"].원문).not.toBe("바꿈");
  });
});

describe("전체 점검에서 붙는지", () => {
  it("모든 미충족 판정에 근거 조문이 하나 이상 붙는다 (샘플 9사례)", () => {
    let 미충족수 = 0;
    for (const 사례 of 시험.사례) {
      for (const 판정 of 전체점검({ 모드: "가상", ...사례.입력 } as 사건정보)) {
        if (판정.상태 !== "미충족") continue;
        미충족수 += 1;
        expect(판정.근거조문?.length, `${사례.id} ${판정.항목}`).toBeGreaterThan(0);
      }
    }
    expect(미충족수).toBeGreaterThan(0);
  });
});
