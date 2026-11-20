// 업로드 파일 검사 (형식·크기)
// Design Ref: §2-2 — 파일 하나가 한도 이하인지 업로드 전에 먼저 검사한다. 파일은 하나씩 따로 보낸다.
// Plan SC: PLAN 작업 13번 — PDF·HWP·Word·JPG만 받고, 한도(약 4.5MB)를 넘으면 안내 문구로 알린다.
//
// 한도는 배포 환경(Vercel)이 한 번에 받는 크기(약 4.5MB)에서 나왔다. 배포 때 다시 확인한다. (DESIGN 5-1)
// 보낼 때 붙는 부가 정보도 있으니 여유를 두어 십진수 4.5MB(4,500,000바이트)로 잡는다.
// 쪽수 제한은 두지 않는다.

export const 파일크기한도 = 4_500_000; // 바이트

export const 허용형식 = [".pdf", ".hwp", ".doc", ".docx", ".jpg", ".jpeg"] as const;

/** 파일 입력 칸의 accept 값 */
export const 허용형식목록글 = 허용형식.join(",");

export interface 파일정보 {
  name: string;
  size: number;
}

export type 검사결과 = { 통과: true } | { 통과: false; 이유: string };

function 확장자(이름: string): string {
  const 점 = 이름.lastIndexOf(".");
  return 점 < 0 ? "" : 이름.slice(점).toLowerCase();
}

export function 파일검사(파일: 파일정보): 검사결과 {
  if (!(허용형식 as readonly string[]).includes(확장자(파일.name))) {
    return { 통과: false, 이유: "PDF, HWP, Word, JPG 파일만 올릴 수 있어요." };
  }
  if (파일.size <= 0) {
    return { 통과: false, 이유: "내용이 비어 있는 파일이에요." };
  }
  if (파일.size > 파일크기한도) {
    return {
      통과: false,
      이유: `파일이 너무 커서 가상 서류로는 올릴 수 없어요. (${크기글(파일.size)}, 한 파일 ${크기글(파일크기한도)} 이하)`,
    };
  }
  return { 통과: true };
}

/** 사람이 읽는 크기. 예: 1.2MB */
export function 크기글(바이트: number): string {
  if (바이트 >= 1_000_000) return `${(바이트 / 1_000_000).toFixed(1)}MB`;
  if (바이트 >= 1_000) return `${Math.round(바이트 / 1_000)}KB`;
  return `${바이트}B`;
}

/** Word에서 뽑은 글을 AI에 보낼 수 있는 최대 글자 수. 압축률 높은 파일로 비용이 폭증하는 것을 막는다. (CHECK.md G8) */
export const 최대글자수 = 200_000;

/**
 * 파일의 첫 몇 바이트가 확장자가 말하는 형식과 맞는지 본다. (확장자만 바꾼 파일을 걸러낸다. CHECK.md G8)
 *  - PDF: "%PDF-", JPG: FF D8 FF, DOCX: "PK"(압축 묶음) 로 시작
 *  - 위 세 형식이 아니면(.hwp 등) 여기서는 따지지 않고 true를 돌려준다.
 */
export function 내용형식맞음(이름: string, 앞바이트: Uint8Array): boolean {
  const 소문자 = 이름.toLowerCase();
  const 시작 = (...바이트들: number[]) => 바이트들.every((값, 번호) => 앞바이트[번호] === 값);
  if (소문자.endsWith(".pdf")) return 시작(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (소문자.endsWith(".jpg") || 소문자.endsWith(".jpeg")) return 시작(0xff, 0xd8, 0xff);
  if (소문자.endsWith(".docx")) return 시작(0x50, 0x4b);
  return true;
}
