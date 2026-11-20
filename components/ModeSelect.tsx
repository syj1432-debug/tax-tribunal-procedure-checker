"use client";

// 시작 화면: "가상 서류 / 실제 서류" 모드 선택
// Design Ref: §1-1 — 어떤 서류로 점검할지 먼저 고르게 한다. (기본값 없음, 반드시 직접 선택)
// Plan SC: 실제 서류 모드에서는 파일 업로드와 외부 AI 호출이 막힌다 — 그 규칙의 출발점이 이 선택이다.
// (컴포넌트 이름은 React 규칙상 영문 대문자로 시작해야 해서 영문으로 짓는다.)

import type { 모드 } from "@/lib/types";

interface ModeSelectProps {
  /** 모드를 골랐을 때 부모에게 알린다 */
  onSelect: (모드: 모드) => void;
}

const 카드 = [
  {
    모드: "가상" as const,
    제목: "가상 서류",
    설명: ["파일 업로드 +", "AI 자동 추출"],
  },
  {
    모드: "실제" as const,
    제목: "실제 서류",
    설명: ["값을 직접 입력", "(파일·AI 사용 안 함)"],
  },
];

export default function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <section className="w-full max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">조세심판 절차적 요건 점검기</h1>
      <p className="mt-6 text-lg">어떤 서류로 점검하시겠습니까?</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {카드.map((항목) => (
          <button
            key={항목.모드}
            type="button"
            onClick={() => onSelect(항목.모드)}
            className="rounded-lg border border-zinc-300 p-6 text-left transition-colors hover:border-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-200 dark:hover:bg-zinc-900"
          >
            <span className="block text-xl font-medium">{항목.제목}</span>
            <span className="mt-2 block text-zinc-600 dark:text-zinc-400">
              {항목.설명.map((줄) => (
                <span key={줄} className="block">
                  {줄}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        ※ 실제 서류는 외부 AI 서비스로 보내지 않습니다.
      </p>
    </section>
  );
}
