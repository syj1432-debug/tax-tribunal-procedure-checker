"use client";

// 점검 결과 화면
// Design Ref: §1-3 — 각하 요건 해당 가능성 요약 + 네 항목의 상태·상태뜻·근거·계산 과정
// Plan SC: PLAN 작업 9번 — 네 항목 상태, 각하 요건 해당 가능성, 근거 표시
// 화면에 글자로 나오는 값은 모두 마스킹을 거친다. (작업 10번, PRD 7번)
// 근거 조문 원문은 작업 16번에서 붙였다. 서류상 위치·원본 보기는 다음 작업에서 채운다. 보고서는 작업 17번(ReportView).

import { 마스킹 } from "@/lib/mask";
import type { 각하가능성 } from "@/lib/rules";
import type { 상태, 점검결과, 점검항목 } from "@/lib/types";

interface ResultViewProps {
  결과들: 점검결과[];
  가능성: 각하가능성;
  onBack: () => void;
  /** [점검 종료]: 입력값·점검 결과를 모두 지우고 시작 화면으로 돌아간다. (작업 11번) */
  onEnd: () => void;
  /** [보고서 내려받기]: 인쇄 창(PDF로 저장)을 열고, 창이 닫히면 입력값·결과를 지운다. (작업 17번) */
  onDownload: () => void;
}

// 항목 이름은 문제가 있는 쪽을 가리킨다. (그래서 상태 옆에 뜻을 함께 보여준다)
const 항목이름: Record<점검항목, string> = {
  청구기간: "청구기간 경과",
  처분부존재: "처분 부존재",
  청구인부적격: "청구인 부적격",
  대리인부적격: "대리인 부적격",
};

// 색만으로 구분하지 않도록 글자도 함께 보여준다.
const 상태색: Record<상태, string> = {
  충족: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  미충족: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  "확인 필요": "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  "판단 필요": "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
};

const 가능성설명: Record<각하가능성, string> = {
  있음: "미충족 항목이 있어 각하 사유에 해당할 가능성이 있습니다.",
  없음: "네 항목이 모두 충족되어 각하 사유로 볼 만한 것이 확인되지 않았습니다.",
  "추가 확인 필요": "미충족은 없으나 확인 필요·판단 필요 항목이 있어 아직 결론을 낼 수 없습니다.",
};

export default function ResultView({ 결과들, 가능성, onBack, onEnd, onDownload }: ResultViewProps) {
  return (
    <div>
      <div className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">각하 요건 해당 가능성</p>
        <p className="mt-1 text-2xl font-semibold">{가능성}</p>
        <p className="mt-1 text-sm">{가능성설명[가능성]}</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          ※ 최종 각하결정은 담당자가 내립니다. 이 화면은 가능성과 근거만 보여줍니다.
        </p>
      </div>

      <ul className="mt-6 space-y-4">
        {결과들.map((결과) => (
          <li key={결과.항목} className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{항목이름[결과.항목]}</h3>
              <span className={`rounded px-2 py-0.5 text-sm font-medium ${상태색[결과.상태]}`}>
                {결과.상태} · {결과.상태뜻}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{마스킹(결과.근거)}</p>

            {결과.계산과정 && (
              <div className="mt-3">
                <p className="text-sm font-medium">계산 과정</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-zinc-100 p-2 text-sm dark:bg-zinc-900">
                  {마스킹(결과.계산과정)}
                </pre>
              </div>
            )}

            {/* 근거 조문: 조문 파일(law.go.kr에서 확인한 원문)에 있는 것만 보여준다. (작업 16번) */}
            {결과.근거조문 && 결과.근거조문.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium">근거 조문</p>
                <ul className="mt-1 space-y-2">
                  {결과.근거조문.map((조문) => (
                    <li key={조문.이름} className="rounded border border-zinc-300 text-sm dark:border-zinc-700">
                      <details>
                        <summary className="cursor-pointer px-3 py-2">{조문.이름}</summary>
                        <div className="border-t border-zinc-300 px-3 py-2 dark:border-zinc-700">
                          <p className="whitespace-pre-wrap">{조문.원문}</p>
                          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                            출처: 국가법령정보센터 {조문.주소} · 확인한 날짜 {조문.확인날짜}
                          </p>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {결과.조문확인필요 && (
              <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                조문 확인 필요
                {결과.확인필요조문 && 결과.확인필요조문.length > 0
                  ? `: 아직 조문 파일에 없는 조문 — ${결과.확인필요조문.join(", ")}.`
                  : ": 근거 조문이 조문 파일에 없습니다."}{" "}
                담당자가 조문을 직접 확인해 주세요.
              </p>
            )}
            {결과.서류상위치 && <p className="mt-2 text-sm">서류상 위치: {마스킹(결과.서류상위치)}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          입력으로 돌아가기
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          보고서 내려받기
        </button>
        <button
          type="button"
          onClick={onEnd}
          className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          점검 종료
        </button>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        [보고서 내려받기]를 누르면 인쇄 창이 열립니다. 대상을 &quot;PDF로 저장&quot;으로 고르면 보고서 파일이 만들어집니다. 인쇄 창이 닫히면 입력한 값과 점검 결과가 지워지니, 저장을 취소했다면 다시 점검해야 합니다. [점검 종료]도 같은 값을 모두 지우고 시작 화면으로 돌아가며, 화면을 닫아도 지워집니다.
      </p>
    </div>
  );
}
