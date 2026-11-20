// 브라우저에서 /api/extract를 부르는 코드 (가상 서류 모드 전용)
// Design Ref: §2-2 — 파일은 하나씩 따로 보낸다.
// Plan SC: PLAN 작업 14번

import type { 추출결과 } from "./fields";

export type 읽기결과 = { 성공: true; 결과: 추출결과 } | { 성공: false; 안내: string };

/** 파일 하나를 서버로 보내 값을 읽어 온다. 실패하면 사용자에게 보여줄 안내 글을 돌려준다. */
export async function 파일읽기(파일: File): Promise<읽기결과> {
  const 폼 = new FormData();
  폼.append("모드", "가상"); // 실제 서류 모드에서는 이 함수를 부르는 코드 자체가 없다.
  폼.append("파일", 파일);
  try {
    const 응답 = await fetch("/api/extract", { method: "POST", body: 폼 });
    const 내용 = await 응답.json();
    if (내용.성공) return { 성공: true, 결과: { 값들: 내용.값들, 출처: 내용.출처 } };
    return { 성공: false, 안내: typeof 내용.안내 === "string" ? 내용.안내 : "값을 읽지 못했어요." };
  } catch {
    return { 성공: false, 안내: "서버와 연결하지 못했어요. 값을 직접 입력해 주세요." };
  }
}
