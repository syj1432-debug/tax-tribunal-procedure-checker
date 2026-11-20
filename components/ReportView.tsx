"use client";

// 점검 결과 보고서 (인쇄 전용 화면)
// Design Ref: §1-3 — 보고서는 브라우저의 인쇄(PDF로 저장) 기능으로 만든다. 별도 도구를 쓰지 않는다.
// Plan SC: PLAN 작업 17번(nice) — 점검 결과를 보고서로 내려받기
// 이 화면은 평소에는 보이지 않고(hidden), 인쇄할 때만 나온다. 나머지 화면은 인쇄에서 빠진다(print:hidden).
// 글자로 나가는 값은 모두 마스킹을 거친다. 서류 파일은 보고서에 담지 않는다. (PRD 7번)

import { 마스킹 } from "@/lib/mask";
import type { 각하가능성 } from "@/lib/rules";
import type { 사건정보, 점검결과, 점검항목 } from "@/lib/types";

import { 칸목록 } from "./CaseForm";

interface ReportViewProps {
  정보: 사건정보;
  AI값수: number;
  결과들: 점검결과[];
  가능성: 각하가능성;
}

const 항목이름: Record<점검항목, string> = {
  청구기간: "청구기간 경과",
  처분부존재: "처분 부존재",
  청구인부적격: "청구인 부적격",
  대리인부적격: "대리인 부적격",
};

function 오늘(): string {
  const 지금 = new Date();
  const 두자리 = (n: number) => String(n).padStart(2, "0");
  return `${지금.getFullYear()}-${두자리(지금.getMonth() + 1)}-${두자리(지금.getDate())}`;
}

function 값글(값: 사건정보, 이름: (typeof 칸목록)[number]["이름"]): string {
  const 원래 = 값[이름];
  if (원래 === null || 원래 === undefined || 원래 === "") {
    // 대리인 칸은 비워 두면 "대리인 없음"으로 점검한다. 결과와 같은 말로 적는다. (CHECK.md G5)
    return 이름 === "대리인" ? "(없음 — 대리인 없음으로 점검)" : "(없음 — 확인 필요)";
  }
  if (이름 === "처분서있음") return 원래 ? "있음" : "없음";
  if (이름 === "청구금액" && typeof 원래 === "number") return `${원래.toLocaleString("ko-KR")}원`;
  return 마스킹(String(원래));
}

export default function ReportView({ 정보, AI값수, 결과들, 가능성 }: ReportViewProps) {
  return (
    <article className="hidden w-full text-sm text-black print:block">
      <h1 className="text-xl font-bold">조세심판 절차적 요건 점검 보고서</h1>
      <p className="mt-1">
        점검일 {오늘()} · {정보.모드} 서류 점검
        {정보.모드 === "가상" && " (지어낸 가상 서류로 점검한 결과입니다)"}
      </p>

      <section className="mt-4 border border-black p-3">
        <p>각하 요건 해당 가능성</p>
        <p className="text-lg font-bold">{가능성}</p>
        <p className="mt-1">※ 최종 각하결정은 담당자가 내립니다. 이 보고서는 가능성과 근거만 보여줍니다.</p>
      </section>

      {AI값수 > 0 && (
        <p className="mt-3 border border-black p-2">
          ※ AI가 서류에서 읽은 값 {AI값수}개가 이 결과에 쓰였습니다. 서류와 맞는지 담당자가 확인해야 합니다.
        </p>
      )}

      <h2 className="mt-5 text-base font-bold">항목별 점검 결과</h2>
      <ol className="mt-2 space-y-3">
        {결과들.map((결과) => (
          <li key={결과.항목} className="break-inside-avoid border border-black p-3">
            <p className="font-bold">
              {항목이름[결과.항목]} — {결과.상태} ({결과.상태뜻})
            </p>
            <p className="mt-1 whitespace-pre-wrap">{마스킹(결과.근거)}</p>
            {결과.계산과정 && (
              <>
                <p className="mt-2 font-semibold">계산 과정</p>
                <pre className="whitespace-pre-wrap font-sans">{마스킹(결과.계산과정)}</pre>
              </>
            )}
            {결과.근거조문 && 결과.근거조문.length > 0 && (
              <>
                <p className="mt-2 font-semibold">근거 조문</p>
                <ul className="mt-1 space-y-2">
                  {결과.근거조문.map((조문) => (
                    <li key={조문.이름}>
                      <p className="font-medium">{조문.이름}</p>
                      <p className="whitespace-pre-wrap text-xs">{조문.원문}</p>
                      <p className="text-xs">
                        출처: 국가법령정보센터 {조문.주소} (확인한 날짜 {조문.확인날짜})
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {결과.서류상위치 && (
              <>
                <p className="mt-2 font-semibold">서류상 위치</p>
                <p className="whitespace-pre-wrap">{마스킹(결과.서류상위치)}</p>
              </>
            )}
            {결과.조문확인필요 && (
              <p className="mt-2 font-semibold">
                조문 확인 필요
                {결과.확인필요조문 && 결과.확인필요조문.length > 0
                  ? `: 아직 조문 파일에 없는 조문 — ${결과.확인필요조문.join(", ")}.`
                  : "."}{" "}
                담당자가 조문을 직접 확인해 주세요.
              </p>
            )}
          </li>
        ))}
      </ol>

      <h2 className="mt-5 text-base font-bold">점검에 쓴 정보</h2>
      <table className="mt-2 w-full border-collapse">
        <tbody>
          {칸목록.map((칸) => {
            const 출처 = 정보.출처?.[칸.이름];
            return (
              <tr key={칸.이름} className="break-inside-avoid border border-black">
                <th className="w-40 border border-black p-1 text-left font-medium">{칸.이름표}</th>
                <td className="border border-black p-1">
                  {값글(정보, 칸.이름)}
                  {출처 && !정보.사용자수정?.includes(칸.이름) && (
                    <span className="text-xs">
                      {" "}
                      (출처: {마스킹(출처.파일명)}
                      {출처.쪽수 ? ` ${출처.쪽수}쪽` : ""})
                    </span>
                  )}
                  {정보.사용자수정?.includes(칸.이름) && <span className="text-xs"> (직접 고침)</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-5 text-xs">
        이 보고서는 점검기가 입력된 정보와 정해진 규칙으로 계산한 참고 자료입니다. 서류와 입력값은 서버에 저장되지 않으며,
        보고서를 저장하거나 인쇄한 뒤 화면에서 지워집니다.
      </p>
    </article>
  );
}
