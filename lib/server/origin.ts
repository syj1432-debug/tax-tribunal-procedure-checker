// 요청이 우리 사이트 화면에서 온 것인지 확인한다. (남용 줄이기, CHECK.md G7 / SEC-001)
// Design Ref: §4 — 인증이 없는 공개 API라 다른 웹사이트가 방문자의 브라우저를 시켜 몰래 호출하는 것을 막는다.
//
// 한계: 명령창(curl) 같은 브라우저 밖 호출은 이 헤더를 마음대로 쓸 수 있어 막지 못한다.
// 그건 OpenAI 쪽 월 사용 한도와 Vercel 접근 보호(DEPLOY.md)로 막는다. 이 검사는 보조 수단이다.

import "server-only";

/**
 * 브라우저가 보낸 요청이 다른 사이트에서 온 것이면 false.
 *  - Sec-Fetch-Site가 "cross-site"이면 거부
 *  - Origin이 있으면 요청 받은 주소(host)와 같아야 한다
 *  - 둘 다 없으면(브라우저가 아닌 호출) 여기서는 통과시킨다
 */
export function 같은사이트요청인가(헤더: Headers): boolean {
  if (헤더.get("sec-fetch-site") === "cross-site") return false;
  const 출처 = 헤더.get("origin");
  if (!출처) return true;
  const 받은주소 = 헤더.get("x-forwarded-host") ?? 헤더.get("host");
  try {
    return new URL(출처).host === 받은주소;
  } catch {
    return false;
  }
}
