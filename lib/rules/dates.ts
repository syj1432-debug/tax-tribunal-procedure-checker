// 날짜 계산 도구
// Design Ref: §2-4 — 청구기간 계산에 쓰는 날짜 더하기·요일·형식 검사.
// 날짜는 항상 "YYYY-MM-DD" 글자로 다룬다. 시간대(타임존) 때문에 하루가 밀리지 않도록 UTC 기준으로 계산한다.
// (글자끼리 비교하면 날짜 순서와 같다: "2026-04-06" < "2026-06-08")

import type { 날짜문자열 } from "../types";

const 날짜모양 = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" 모양이면서 실제로 있는 날짜인지 (예: 2026-02-30은 false) */
export function 올바른날짜(값: string): boolean {
  if (!날짜모양.test(값)) return false;
  const 날 = new Date(`${값}T00:00:00Z`);
  return !Number.isNaN(날.getTime()) && 날.toISOString().slice(0, 10) === 값;
}

/** 날짜에 일수를 더한다. 음수도 가능. (예: 일수더하기("2026-03-10", 90) → "2026-06-08") */
export function 일수더하기(값: 날짜문자열, 일수: number): 날짜문자열 {
  const 날 = new Date(`${값}T00:00:00Z`);
  날.setUTCDate(날.getUTCDate() + 일수);
  return 날.toISOString().slice(0, 10);
}

/** 요일 번호: 0 = 일요일 … 6 = 토요일 */
export function 요일번호(값: 날짜문자열): number {
  return new Date(`${값}T00:00:00Z`).getUTCDay();
}

const 요일이름 = ["일", "월", "화", "수", "목", "금", "토"];

/** 예: "2026-06-08" → "2026-06-08(월)" */
export function 요일붙이기(값: 날짜문자열): string {
  return `${값}(${요일이름[요일번호(값)]})`;
}
