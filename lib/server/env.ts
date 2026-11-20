// AI 서비스 API 키 읽기 (서버 전용)
// Design Ref: §4 — API 키는 .env에서 서버 코드로만 읽고 공개용 접두사를 쓰지 않는다.
// Plan SC: PLAN 작업 12번 — AI 서비스 API 키를 .env에서 서버 코드로만 읽기 (브라우저에 노출 금지)
//
// 이 파일을 브라우저 쪽 코드(components 등 "use client" 파일)에서 불러오면 아래 "server-only" 때문에
// 빌드가 실패한다. 키 값이 화면용 코드에 섞여 들어가는 실수를 막기 위한 안전장치다.
// 키 값은 로그·화면·오류 메시지에 절대 내보내지 않는다. 있는지 없는지만 다룬다.

import "server-only";

/** AI 호출에 쓰는 키. 없으면 null. 값은 이 함수를 부르는 서버 코드 안에서만 쓴다. */
export function AI키읽기(): string | null {
  const 값 = process.env.OPENAI_API_KEY;
  return typeof 값 === "string" && 값.trim() !== "" ? 값.trim() : null;
}

/** 키가 설정돼 있는지만 알려준다. (값은 알려주지 않는다) */
export function AI키있음(): boolean {
  return AI키읽기() !== null;
}
