"use client";

// 핵심 정보 입력·수정 화면 (오른쪽 ② 칸)
// Design Ref: §1-2 — 청구일 ~ 청구금액 칸을 보여주고, 값이 비어 있으면 "확인 필요" 배지를 붙인다.
// Plan SC: PLAN 작업 4번 — 두 모드(가상·실제) 모두에서 쓰는 직접 입력·수정 화면
// 식별번호(주민등록번호 등)는 점검에 필요하지 않으므로 입력 칸을 두지 않는다. (PRD 7번)

import { 마스킹 } from "@/lib/mask";
import type { 값이름, 사건정보 } from "@/lib/types";

interface CaseFormProps {
  /** 지금 입력된 사건 정보 */
  값: 사건정보;
  /** 칸 하나가 바뀔 때 알린다. 비운 칸은 null로 넘어온다. */
  onChange: <K extends 값이름>(이름: K, 새값: 사건정보[K]) => void;
  /** [점검하기]를 눌렀을 때 알린다. 빈 칸은 점검에서 "확인 필요"가 되므로 언제든 누를 수 있다. */
  onInspect: () => void;
}

type 칸 =
  | { 이름: 값이름; 이름표: string; 안내?: string; 종류: "글자" | "날짜" | "숫자" }
  | { 이름: 값이름; 이름표: string; 안내?: string; 종류: "선택"; 선택지: { 값: string; 글: string }[] };

// DESIGN §1-2 그림의 순서와 같다.
export const 칸목록: 칸[] = [
  { 이름: "청구일", 이름표: "청구일", 안내: "서류에 적힌 날짜 (참고용)", 종류: "날짜" },
  { 이름: "우편소인일", 이름표: "우편소인일", 종류: "날짜" },
  { 이름: "접수일", 이름표: "접수일", 안내: "조세심판원 접수일", 종류: "날짜" },
  { 이름: "처분일", 이름표: "처분일", 종류: "날짜" },
  { 이름: "처분을안날", 이름표: "처분을 안 날", 종류: "날짜" },
  { 이름: "처분청", 이름표: "처분청", 종류: "글자" },
  { 이름: "처분상대방", 이름표: "처분 상대방", 안내: "납세고지서 수신자 등", 종류: "글자" },
  {
    이름: "처분서있음",
    이름표: "처분서",
    안내: "처분서(납세고지서 등)가 서류에 있는지. 서류에서 처분서를 못 찾아도 자동으로 \"없음\"이 되지 않으니, 서류를 보고 직접 골라 주세요",
    종류: "선택",
    선택지: [
      { 값: "있음", 글: "있음" },
      { 값: "없음", 글: "없음" },
    ],
  },
  { 이름: "청구인", 이름표: "청구인", 종류: "글자" },
  { 이름: "대리인", 이름표: "대리인", 종류: "글자" },
  { 이름: "대리인관계자격", 이름표: "대리인과의 관계·자격", 안내: "예: 청구인의 배우자", 종류: "글자" },
  {
    이름: "사건유형",
    이름표: "사건 유형",
    종류: "선택",
    선택지: [
      { 값: "소액", 글: "소액" },
      { 값: "일반", 글: "일반" },
    ],
  },
  { 이름: "청구금액", 이름표: "청구금액 (원)", 안내: "소액 여부 확인용", 종류: "숫자" },
];

// 칸마다 화면에 보이는 글자(문자열)를 구한다. 비어 있으면 빈 글자.
function 화면값(값: 사건정보, 칸: 칸): string {
  const 원래값 = 값[칸.이름];
  if (원래값 === null || 원래값 === undefined) return "";
  if (칸.이름 === "처분서있음") return 원래값 ? "있음" : "없음";
  return String(원래값);
}

const 입력모양 =
  "w-full rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700";

// 서류에서 읽어 채운 값이고 사용자가 아직 고치지 않은 값인가
function 읽은값인지(값: 사건정보, 이름: 값이름): boolean {
  return !!값.출처?.[이름] && !값.사용자수정?.includes(이름);
}

const 배지모양 = "rounded px-2 py-0.5 text-xs";

// 칸마다 값이 어디서 왔는지 한눈에 보이게 한다. (작업 15번)
//  - 서류에서 읽음: 가상 서류 모드에서 AI가 읽어 채운 값 (서류와 맞는지 확인 대상)
//  - 직접 고침: 사용자가 고친 값 (다시 읽어도 덮어쓰지 않는다)
//  - 확인 필요: 비어 있는 값 (점검할 때 "확인 필요"가 된다)
function 상태배지({ 값, 칸이름, 비었음 }: { 값: 사건정보; 칸이름: 값이름; 비었음: boolean }) {
  if (값.사용자수정?.includes(칸이름)) {
    return (
      <span className={`${배지모양} bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100`}>
        직접 고침{비었음 ? " · 비워 둠" : ""}
      </span>
    );
  }
  if (비었음) {
    return (
      <span className={`${배지모양} bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100`}>
        확인 필요
      </span>
    );
  }
  if (읽은값인지(값, 칸이름)) {
    return (
      <span className={`${배지모양} bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100`}>
        서류에서 읽음
      </span>
    );
  }
  return null;
}

export default function CaseForm({ 값, onChange, onInspect }: CaseFormProps) {
  // 화면에서 받은 글자를 사건정보의 알맞은 모양(날짜 글자, 숫자, true/false)으로 바꿔 알린다.
  function 바뀜(칸: 칸, 입력: string) {
    // onChange의 두 번째 인자는 칸마다 모양이 달라서, 여기서만 느슨하게 넘긴다.
    const 알리기 = onChange as (이름: 값이름, 새값: unknown) => void;
    if (입력 === "") return 알리기(칸.이름, null);
    if (칸.종류 === "숫자") return 알리기(칸.이름, Number(입력));
    if (칸.이름 === "처분서있음") return 알리기(칸.이름, 입력 === "있음");
    // 글자 칸에 식별번호가 들어오면 보관하기 전에 가린다. (점검에 번호는 필요 없다. 작업 10번)
    return 알리기(칸.이름, 칸.종류 === "글자" ? 마스킹(입력) : 입력);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">핵심 정보 확인·수정</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        서류에 없는 값은 비워 두세요. 비운 칸은 점검할 때 &quot;확인 필요&quot;가 됩니다. 서류에서 읽어 채운 값(&quot;서류에서 읽음&quot;)은 서류와 맞는지 확인하고, 틀리면 고쳐 주세요. 고친 값은 파일을 다시 올려도 바뀌지 않습니다. 주민등록번호 같은 식별번호는 점검에 필요하지 않으니 적지 마세요. 적어도 자동으로 가려집니다.
      </p>

      <div className="mt-4 space-y-4">
        {칸목록.map((칸) => {
          const 현재 = 화면값(값, 칸);
          const 아이디 = `칸-${칸.이름}`;
          return (
            <div key={칸.이름}>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={아이디} className="font-medium">
                  {칸.이름표}
                </label>
                <상태배지 값={값} 칸이름={칸.이름} 비었음={현재 === ""} />
              </div>
              {칸.안내 && <p className="text-sm text-zinc-600 dark:text-zinc-400">{칸.안내}</p>}
              {/* 가상 서류에서 읽은 값이면 어느 파일 몇 쪽에서 읽었는지 보여준다. (PRD 5번) */}
              {현재 !== "" && 읽은값인지(값, 칸.이름) && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  출처: {값.출처![칸.이름]!.파일명}
                  {값.출처![칸.이름]!.쪽수 ? ` ${값.출처![칸.이름]!.쪽수}쪽` : ""}
                </p>
              )}
              {현재 !== "" && 칸.이름 === "처분서있음" && 읽은값인지(값, 칸.이름) && (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  AI가 처분서로 보이는 문서를 찾아 &quot;있음&quot;으로 채운 값입니다. 처분서가 맞는지 확인해 주세요.
                </p>
              )}

              {칸.종류 === "선택" ? (
                <select
                  id={아이디}
                  value={현재}
                  onChange={(e) => 바뀜(칸, e.target.value)}
                  className={`mt-1 ${입력모양}`}
                >
                  <option value="">선택 안 함</option>
                  {칸.선택지.map((선택) => (
                    <option key={선택.값} value={선택.값}>
                      {선택.글}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={아이디}
                  type={칸.종류 === "날짜" ? "date" : 칸.종류 === "숫자" ? "number" : "text"}
                  min={칸.종류 === "숫자" ? 0 : undefined}
                  value={현재}
                  onChange={(e) => 바뀜(칸, e.target.value)}
                  className={`mt-1 ${입력모양}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onInspect}
          className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          점검하기
        </button>
      </div>
    </div>
  );
}
