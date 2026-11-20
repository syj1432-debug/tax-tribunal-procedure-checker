"use client";

// 점검 앱: 시작 → 입력 → 결과 단계를 한 주소(/) 안에서 바꿔 보여준다.
// Design Ref: §1 — 값을 저장하지 않으므로 주소를 바꾸지 않고 단계만 바꾼다.
// 지금까지 만든 것: 시작 화면(작업 3번), 입력 화면의 ② 칸(작업 4번), 점검 결과 화면(작업 9번), 서류 올리기(작업 13~15번), 보고서(작업 17번).
// (컴포넌트 이름은 React 규칙상 영문 대문자로 시작해야 해서 영문으로 짓는다.)

import { useRef, useState } from "react";

import { 파일읽기 } from "@/lib/extract/client";
import { AI읽은값수, 추출값합치기, 파일값지우기, type 추출결과 } from "@/lib/extract/fields";

import { 각하가능성요약, 전체점검 } from "@/lib/rules";
import type { 값이름, 모드, 사건정보, 점검결과 } from "@/lib/types";

import CaseForm from "./CaseForm";
import ModeSelect from "./ModeSelect";
import ReportView from "./ReportView";
import ResultView from "./ResultView";
import UploadPanel, { type 올린파일 } from "./UploadPanel";

export default function InspectionApp() {
  // 모드를 고르기 전에는 null → 시작 화면. 고르면 사건정보가 만들어지고 입력 화면이 된다.
  const [정보, 정보바꾸기] = useState<사건정보 | null>(null);
  // 점검 결과. null이면 입력 화면, 값이 있으면 결과 화면이다. 값은 브라우저 메모리에만 있다.
  const [결과들, 결과바꾸기] = useState<점검결과[] | null>(null);
  // 가상 서류 모드에서 올려 둔 파일. 브라우저 메모리에만 있고, 처음으로·점검 종료 때 비운다. (작업 13번)
  const [항목들, 항목바꾸기] = useState<올린파일[]>([]);
  // 처음으로·점검 종료 뒤에 늦게 도착한 읽기 결과가 새 점검에 섞이지 않게, 점검마다 번호를 매긴다.
  const 점검번호 = useRef(0);
  const 다음파일번호 = useRef(0);
  // 서버에는 파일을 하나씩 차례로 보낸다. (앞 파일이 끝나야 다음을 보낸다)
  const 읽기줄 = useRef<Promise<void>>(Promise.resolve());
  // 파일별로 읽은 값의 기록. 파일을 빼면 남은 파일의 기록으로 값을 다시 채우는 데 쓴다. (브라우저 메모리에만 있음)
  // 읽는 중인 파일의 전송을 끊는 장치. [빼기]·[처음으로]를 누르면 끊고, 아직 차례가 안 온 파일은 보내지 않는다. (CHECK.md G2)
  const 중단장치 = useRef(new Map<number, AbortController>());
  const 뺀파일 = useRef(new Set<number>());
  const 읽은기록 = useRef<{ 번호: number; 파일명: string; 결과: 추출결과 }[]>([]);

  // 읽는 중이던 전송을 모두 끊고 기록을 비운다.
  function 읽기모두취소() {
    for (const 장치 of 중단장치.current.values()) 장치.abort();
    중단장치.current.clear();
    뺀파일.current.clear();
    읽은기록.current = [];
    점검번호.current += 1; // 아직 읽는 중인 파일의 결과는 버린다.
  }

  function 모드골랐을때(모드: 모드) {
    읽기모두취소();
    정보바꾸기({ 모드 });
    결과바꾸기(null);
    항목바꾸기([]);
  }

  // 처음으로·점검 종료: 입력한 값과 결과를 모두 비우고 시작 화면으로 돌아간다.
  // 값은 브라우저 메모리(이 화면의 상태)에만 있으므로 비우면 남는 것이 없다.
  // 올린 파일(작업 13번)과 읽은 값(작업 14번)도 여기서 함께 비운다.
  function 처음으로() {
    정보바꾸기(null);
    결과바꾸기(null);
    항목바꾸기([]); // 올린 파일도 함께 비운다.
    읽기모두취소(); // 읽는 중인 전송을 끊고 읽은 값의 기록도 비운다.
  }

  // 칸 하나를 바꾼다. 가상 서류 모드에서는 사용자가 고친 값으로 표시해 두어,
  // 나중에 다시 추출해도 덮어쓰지 않게 한다. (PRD 5번)
  function 칸바꾸기<K extends 값이름>(이름: K, 새값: 사건정보[K]) {
    정보바꾸기((이전) => {
      if (이전 === null) return 이전;
      const 다음: 사건정보 = { ...이전, [이름]: 새값 };
      if (이전.모드 === "가상" && !이전.사용자수정?.includes(이름)) {
        다음.사용자수정 = [...(이전.사용자수정 ?? []), 이름];
      }
      return 다음;
    });
  }

  // 파일을 더하면 하나씩 차례로 서버에 보내 값을 읽고, 읽은 값을 입력 칸에 합친다. (작업 14번)
  function 파일더하기(새파일들: File[]) {
    // 서류 올리기는 가상 서류 모드에서만 쓴다. 다른 모드에서는 서버로 보내지 않는다. (CHECK.md G3)
    if (정보?.모드 !== "가상") return;
    const 이번점검 = 점검번호.current;
    const 새항목들: 올린파일[] = 새파일들.map((파일) => ({ 번호: 다음파일번호.current++, 파일, 상태: "읽는 중" }));
    항목바꾸기((이전) => [...이전, ...새항목들]);

    for (const 항목 of 새항목들) {
      읽기줄.current = 읽기줄.current.then(async () => {
        // 그 사이에 점검이 끝났거나 파일을 뺐으면 보내지 않는다.
        if (점검번호.current !== 이번점검 || 뺀파일.current.has(항목.번호)) return;
        const 장치 = new AbortController();
        중단장치.current.set(항목.번호, 장치);
        const 결과 = await 파일읽기(항목.파일, 장치.signal);
        중단장치.current.delete(항목.번호);
        if (점검번호.current !== 이번점검 || 뺀파일.current.has(항목.번호)) return;
        if (결과.성공) {
          읽은기록.current.push({ 번호: 항목.번호, 파일명: 항목.파일.name, 결과: 결과.결과 });
          정보바꾸기((이전) => (이전 === null ? 이전 : 추출값합치기(이전, 결과.결과)));
        }
        항목바꾸기((이전) =>
          이전.map((x) =>
            x.번호 === 항목.번호
              ? 결과.성공
                ? { ...x, 상태: "읽음" }
                : { ...x, 상태: "못 읽음", 안내: 결과.안내 }
              : x,
          ),
        );
      });
    }
  }

  // 파일을 빼면 그 파일에서 읽어 채운 값을 지우고, 남은 파일의 기록으로 다시 채운다.
  // (사용자가 고친 값은 그대로 둔다. 같은 칸을 다른 파일도 읽었으면 그 값이 들어간다.)
  function 파일빼기(번호: number) {
    const 뺄것 = 항목들.find((x) => x.번호 === 번호);
    뺀파일.current.add(번호); // 대기 중이면 보내지 않고, 읽는 중이면 전송을 끊는다.
    중단장치.current.get(번호)?.abort();
    중단장치.current.delete(번호);
    항목바꾸기((이전) => 이전.filter((x) => x.번호 !== 번호));
    if (!뺄것) return;
    읽은기록.current = 읽은기록.current.filter((x) => x.번호 !== 번호);
    const 남은기록 = 읽은기록.current;
    정보바꾸기((이전) => {
      if (이전 === null) return 이전;
      let 다음 = 파일값지우기(이전, 뺄것.파일.name);
      for (const 기록 of 남은기록) 다음 = 추출값합치기(다음, 기록.결과);
      return 다음;
    });
  }

  // [점검하기]를 누르면 규칙 코드 4개가 판정한다. (AI를 쓰지 않으므로 같은 값이면 늘 같은 결과)
  function 점검하기() {
    if (정보 === null) return;
    결과바꾸기(전체점검(정보));
  }

  // [보고서 내려받기]: 인쇄 창을 열고(PDF로 저장), 창이 닫히면 입력값·결과를 지운다. (작업 17번, DESIGN 5번 3)
  // 인쇄 창에서 저장을 취소해도 창이 닫히면 지워지므로, 그때는 다시 점검해야 한다. 버튼 옆 안내 글에 적어 둔다.
  // 그냥 Ctrl+P로 인쇄할 때는 지우지 않는다. (이 버튼을 눌렀을 때만 지운다)
  function 보고서내려받기() {
    const 끝났을때 = () => {
      window.removeEventListener("afterprint", 끝났을때);
      처음으로();
    };
    window.addEventListener("afterprint", 끝났을때);
    window.print();
  }

  if (정보 === null) {
    return <ModeSelect onSelect={모드골랐을때} />;
  }

  return (
    <section className="w-full max-w-4xl">
      {/* Design Ref: §1-2 — 입력 화면 위쪽의 "모드 표시"와 "처음으로" */}
      <div className="flex items-center justify-between border-b border-zinc-300 pb-3 print:hidden dark:border-zinc-700">
        <span className="font-medium">모드 표시: {정보.모드} 서류</span>
        {/* 처음으로 돌아가면 입력한 값을 모두 비운다. (점검이 끝나면 값을 남기지 않는 원칙) */}
        <button
          type="button"
          onClick={처음으로}
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          처음으로
        </button>
      </div>

      {결과들 !== null ? (
        <>
          <div className="mt-6 print:hidden">
            <ResultView
              결과들={결과들}
              AI값수={AI읽은값수(정보)}
              가능성={각하가능성요약(결과들)}
              onBack={() => 결과바꾸기(null)}
              onEnd={처음으로}
              onDownload={보고서내려받기}
            />
          </div>
          {/* 인쇄할 때만 보이는 보고서 */}
          <ReportView 정보={정보} AI값수={AI읽은값수(정보)} 결과들={결과들} 가능성={각하가능성요약(결과들)} />
        </>
      ) : (
      <div className={`mt-6 grid gap-8 ${정보.모드 === "가상" ? "md:grid-cols-2" : ""}`}>
        {/* ① 서류 올리기는 가상 서류 모드에서만 나온다. 실제 서류 모드에서는 화면도 코드 경로도 없다. */}
        {정보.모드 === "가상" && (
          <UploadPanel 항목들={항목들} onAdd={파일더하기} onRemove={파일빼기} />
        )}

        <div className={정보.모드 === "실제" ? "max-w-xl" : ""}>
          {정보.모드 === "실제" && (
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              실제 서류 모드에서는 파일 업로드와 AI 호출을 사용하지 않고, 값을 직접 입력합니다.
            </p>
          )}
          <CaseForm
            값={정보}
            onChange={칸바꾸기}
            onInspect={점검하기}
            읽는중={항목들.some((x) => x.상태 === "읽는 중")}
          />
        </div>
      </div>
      )}
    </section>
  );
}
