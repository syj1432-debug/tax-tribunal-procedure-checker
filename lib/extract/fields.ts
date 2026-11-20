// 자동 추출 값의 모양과 정리 (서버·브라우저 모두 쓰는 순수 코드)
// Design Ref: §2-2 — AI는 서류에서 값을 읽기만 한다. 값 + 출처 + 확신 정도를 돌려받고, 확신이 낮은 값은 비워 "확인 필요"로 둔다.
// Plan SC: PLAN 작업 14번 — 핵심 정보 자동 추출과 출처(파일명, 쪽수) 표시
//
// 이 파일에는 AI를 부르는 코드가 없다. AI가 돌려준 값을 믿을 수 있는 모양으로 걸러내는 일만 한다.
// (판정은 점검 규칙 코드가 한다. AI는 판정하지 않는다.)

import { 마스킹 } from "../mask";
import { 올바른날짜 } from "../rules/dates";
import type { 값이름, 사건정보 } from "../types";

/** AI에게 뽑아 달라고 하는 칸. 사건유형은 서류에 적힌 글이 아니라 청구금액으로 확인하므로 뽑지 않는다. */
export const 추출칸 = [
  { 이름: "청구일", 종류: "날짜", 설명: "청구서에 적힌 작성(청구) 날짜" },
  { 이름: "우편소인일", 종류: "날짜", 설명: "우편 봉투·접수증의 우편날짜도장(소인) 날짜" },
  { 이름: "접수일", 종류: "날짜", 설명: "조세심판원 접수일" },
  { 이름: "처분일", 종류: "날짜", 설명: "처분(납세고지 등)을 한 날" },
  { 이름: "처분을안날", 종류: "날짜", 설명: "청구인이 처분이 있음을 안 날(고지서를 받은 날 등)" },
  { 이름: "처분청", 종류: "글자", 설명: "처분을 한 세무서 등 행정청" },
  {
    이름: "처분서있음",
    종류: "예아니오",
    설명:
      "처분서(납세고지서·결정통지서 등 행정청이 처분 내용을 통지한 문서)가 이 파일에 있는지. 이 파일 자체가 처분서이거나 처분서가 첨부·사본으로 들어 있으면 \"예\", 그 밖에는 반드시 비운다. 파일 하나만으로 \"없다\"고 말할 수 없으므로 \"아니오\"는 쓰지 않는다",
  },
  { 이름: "처분상대방", 종류: "글자", 설명: "납세고지서 수신자 등 처분을 받은 사람" },
  { 이름: "청구인", 종류: "글자", 설명: "심판청구를 한 사람" },
  { 이름: "대리인", 종류: "글자", 설명: "청구인을 대리하는 사람(없으면 비운다)" },
  { 이름: "대리인관계자격", 종류: "글자", 설명: "대리인과 청구인의 관계(배우자 등)나 자격(변호사·세무사 등)" },
  { 이름: "청구금액", 종류: "숫자", 설명: "심판청구금액(원). 숫자만" },
] as const satisfies readonly { 이름: 값이름; 종류: string; 설명: string }[];

export type 추출칸이름 = (typeof 추출칸)[number]["이름"];

export type 확신 = "높음" | "낮음";

/** AI가 칸 하나에 대해 돌려주는 모양 */
export interface AI칸값 {
  /** 서류에서 읽은 값. 못 찾았으면 null. 날짜는 YYYY-MM-DD, 예/아니오는 "예"/"아니오", 숫자는 숫자만 */
  값: string | null;
  /** 값을 찾은 쪽 번호. 모르면 null */
  쪽수: number | null;
  확신: 확신;
}

export type AI원본 = Record<추출칸이름, AI칸값>;

/** 정리를 마친 추출 결과: 믿을 수 있는 값만 담긴다. */
export interface 추출결과 {
  값들: Partial<Pick<사건정보, 추출칸이름>>;
  출처: Partial<Record<추출칸이름, { 파일명: string; 쪽수?: number }>>;
}

/** AI에게 요구하는 JSON 모양 (OpenAI 구조화 출력용) */
export function AI응답모양() {
  const 칸 = {
    type: "object",
    additionalProperties: false,
    required: ["값", "쪽수", "확신"],
    properties: {
      값: { type: ["string", "null"] },
      쪽수: { type: ["integer", "null"] },
      확신: { type: "string", enum: ["높음", "낮음"] },
    },
  };
  return {
    type: "object",
    additionalProperties: false,
    required: 추출칸.map((c) => c.이름),
    properties: Object.fromEntries(추출칸.map((c) => [c.이름, 칸])),
  };
}

function 숫자로(글: string): number | null {
  const 숫자만 = 글.replace(/[,\s원]/g, "");
  if (!/^\d+$/.test(숫자만)) return null;
  const 값 = Number(숫자만);
  return Number.isSafeInteger(값) ? 값 : null;
}

/**
 * AI가 돌려준 값을 걸러 믿을 수 있는 것만 남긴다.
 *  - 확신이 "낮음"이거나 값이 비어 있으면 버린다. (추측으로 채우지 않는다)
 *  - 날짜는 YYYY-MM-DD에 실제로 있는 날짜일 때만 받는다.
 *  - 글자는 식별번호를 가린다. (마스킹)
 *  - 형식에 맞지 않는 값은 버린다.
 */
export function 추출값정리(원본: unknown, 파일명: string): 추출결과 {
  const 결과: 추출결과 = { 값들: {}, 출처: {} };
  if (typeof 원본 !== "object" || 원본 === null) return 결과;
  const 입력 = 원본 as Record<string, unknown>;

  for (const 칸 of 추출칸) {
    const 항목 = 입력[칸.이름] as Partial<AI칸값> | undefined;
    if (!항목 || typeof 항목 !== "object") continue;
    if (항목.확신 !== "높음") continue;
    if (typeof 항목.값 !== "string" || 항목.값.trim() === "") continue;
    const 글 = 항목.값.trim();

    let 값: string | number | boolean | null = null;
    if (칸.종류 === "날짜") 값 = 올바른날짜(글) ? 글 : null;
    else if (칸.종류 === "숫자") 값 = 숫자로(글);
    // 처분서가 "없다"는 것은 파일 하나를 보고 말할 수 없고(다른 파일에 있을 수 있다), 틀리면 각하 쪽 결과가 나온다.
    // 그래서 AI가 "아니오"라고 해도 받지 않는다. "없음"은 담당자가 직접 고른다. (작업 18번)
    else if (칸.종류 === "예아니오") 값 = 글 === "예" ? true : null;
    else 값 = 마스킹(글);
    if (값 === null) continue;

    (결과.값들 as Record<string, unknown>)[칸.이름] = 값;
    const 쪽수 = typeof 항목.쪽수 === "number" && Number.isInteger(항목.쪽수) && 항목.쪽수 > 0 ? 항목.쪽수 : undefined;
    결과.출처[칸.이름] = 쪽수 ? { 파일명, 쪽수 } : { 파일명 };
  }
  return 결과;
}

/**
 * 추출 결과를 지금 사건 정보에 합친다. (PRD 5번)
 *  - 사용자가 직접 고친 칸(사용자수정)은 덮어쓰지 않는다.
 *  - 이미 값이 있는 칸은 덮어쓰지 않는다. (여러 파일에서 같은 칸을 읽으면 먼저 읽은 값을 둔다)
 *  - 출처는 값이 들어간 칸에만 남긴다.
 */
export function 추출값합치기(현재: 사건정보, 새것: 추출결과): 사건정보 {
  const 다음: 사건정보 = { ...현재, 출처: { ...현재.출처 } };
  for (const 이름 of Object.keys(새것.값들) as 추출칸이름[]) {
    if (현재.사용자수정?.includes(이름)) continue;
    const 이전 = 현재[이름];
    if (이전 !== null && 이전 !== undefined && 이전 !== "") continue;
    (다음 as unknown as Record<string, unknown>)[이름] = 새것.값들[이름];
    const 출처 = 새것.출처[이름];
    if (출처) 다음.출처 = { ...다음.출처, [이름]: 출처 };
  }
  return 다음;
}

/**
 * 파일을 뺄 때, 그 파일에서 읽어 채운 값을 지운다. (작업 15번)
 *  - 사용자가 고친 칸은 지우지 않는다.
 *  - 다른 파일에서 읽은 값은 그대로 둔다.
 */
export function 파일값지우기(현재: 사건정보, 파일명: string): 사건정보 {
  const 다음: 사건정보 = { ...현재 };
  const 남은출처: NonNullable<사건정보["출처"]> = {};
  for (const [이름, 출처] of Object.entries(현재.출처 ?? {}) as [값이름, { 파일명: string; 쪽수?: number }][]) {
    if (출처.파일명 === 파일명 && !현재.사용자수정?.includes(이름)) {
      (다음 as unknown as Record<string, unknown>)[이름] = null;
    } else {
      남은출처[이름] = 출처;
    }
  }
  다음.출처 = 남은출처;
  return 다음;
}
