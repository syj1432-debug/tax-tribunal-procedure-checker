// 첫 화면. 실제 동작은 InspectionApp(클라이언트 컴포넌트)이 맡는다.
// Design Ref: §1 — 시작·입력·결과 화면을 한 주소(/) 안에서 단계별로 전환한다.

import InspectionApp from "@/components/InspectionApp";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <InspectionApp />
    </main>
  );
}
