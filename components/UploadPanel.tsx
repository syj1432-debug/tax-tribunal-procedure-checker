"use client";

// 서류 올리기 (가상 서류 모드 전용, 왼쪽 ① 칸)
// Design Ref: §1-2 — 파일을 끌어다 놓거나 고른다. PDF·HWP·Word·JPG, 파일 하나가 약 4.5MB 이하.
// Plan SC: PLAN 작업 13번(올리기·검사), 작업 14번(올린 파일마다 읽기 상태 표시)
// 실제 서류 모드에서는 이 화면을 아예 그리지 않는다. (InspectionApp이 가상 모드일 때만 부른다)

import { useRef, useState } from "react";

import { 크기글, 파일검사, 파일크기한도, 허용형식목록글 } from "@/lib/upload";

export type 읽기상태 = "읽는 중" | "읽음" | "못 읽음";

export interface 올린파일 {
  번호: number;
  파일: File;
  상태: 읽기상태;
  /** 못 읽었을 때 이유 */
  안내?: string;
}

interface UploadPanelProps {
  /** 지금 올려 둔 파일들 */
  항목들: 올린파일[];
  /** 검사를 통과한 파일을 더한다 (더하면 바로 값 읽기가 시작된다) */
  onAdd: (파일들: File[]) => void;
  /** 파일 하나를 뺀다 */
  onRemove: (번호: number) => void;
}

const 상태색: Record<읽기상태, string> = {
  "읽는 중": "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
  읽음: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  "못 읽음": "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
};

export default function UploadPanel({ 항목들, onAdd, onRemove }: UploadPanelProps) {
  const 입력칸 = useRef<HTMLInputElement>(null);
  const [거절들, 거절바꾸기] = useState<{ 이름: string; 이유: string }[]>([]);
  const [끄는중, 끄는중바꾸기] = useState(false);

  // 파일을 하나씩 따로 검사해서, 통과한 것만 더하고 나머지는 이유와 함께 알린다.
  function 받기(목록: FileList | null) {
    if (!목록) return;
    const 통과: File[] = [];
    const 거절: { 이름: string; 이유: string }[] = [];
    for (const 파일 of Array.from(목록)) {
      const 결과 = 파일검사(파일);
      if (결과.통과) 통과.push(파일);
      else 거절.push({ 이름: 파일.name, 이유: 결과.이유 });
    }
    거절바꾸기(거절);
    if (통과.length > 0) onAdd(통과);
    // 같은 파일을 다시 고를 수 있게 비운다.
    if (입력칸.current) 입력칸.current.value = "";
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-400 p-4 dark:border-zinc-600">
      <h2 className="text-lg font-semibold">서류 올리기</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        청구서·첨부자료·답변서를 올려 주세요. PDF, HWP, Word, JPG 파일을 올릴 수 있고, 파일 하나가{" "}
        {크기글(파일크기한도)} 이하여야 합니다. 쪽수 제한은 없습니다.
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        ※ 가상 서류만 올려 주세요. 올린 파일은 AI 서비스로 보내 값을 읽습니다. 서버에는 저장하지 않으며, 점검이 끝나면
        올린 파일과 읽은 값은 모두 지워집니다.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          끄는중바꾸기(true);
        }}
        onDragLeave={() => 끄는중바꾸기(false)}
        onDrop={(e) => {
          e.preventDefault();
          끄는중바꾸기(false);
          받기(e.dataTransfer.files);
        }}
        className={`mt-3 rounded border p-4 text-center text-sm ${
          끄는중 ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-900" : "border-zinc-300 dark:border-zinc-700"
        }`}
      >
        <p>파일을 여기로 끌어다 놓거나</p>
        <button
          type="button"
          onClick={() => 입력칸.current?.click()}
          className="mt-2 rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          파일 고르기
        </button>
        <input
          ref={입력칸}
          type="file"
          multiple
          accept={허용형식목록글}
          onChange={(e) => 받기(e.target.files)}
          className="hidden"
          aria-label="서류 파일 고르기"
        />
      </div>

      {거절들.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 text-sm text-red-800 dark:text-red-200">
          {거절들.map((거절, 번호) => (
            <li key={번호}>
              {거절.이름}: {거절.이유}
            </li>
          ))}
        </ul>
      )}

      {항목들.length > 0 && (
        <ul className="mt-3 space-y-2">
          {항목들.map((항목) => (
            <li key={항목.번호} className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {항목.파일.name}{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">({크기글(항목.파일.size)})</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${상태색[항목.상태]}`}>{항목.상태}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(항목.번호)}
                    className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    빼기
                  </button>
                </span>
              </div>
              {항목.안내 && <p className="mt-1 text-amber-800 dark:text-amber-200">{항목.안내}</p>}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        읽은 값은 오른쪽 칸에 채워지고 값마다 출처(파일·쪽)가 표시됩니다. 읽지 못했거나 확신이 낮은 값은 비워 두니,
        서류와 맞는지 확인하고 고쳐 주세요.
      </p>
    </div>
  );
}
