// 가상 서류 자동 추출 (서버 전용)
// Design Ref: §2-2, §4 — 파일을 메모리에서만 읽고 디스크에 저장하지 않는다. 실제 서류 모드 요청은 거부한다. 로그에 서류 내용을 남기지 않는다.
// Plan SC: PLAN 작업 14번 — 업로드한 파일에서 핵심 정보 자동 추출과 출처(파일명, 쪽수)

import { NextResponse } from "next/server";

import { 추출값정리 } from "@/lib/extract/fields";
import { 기록 } from "@/lib/log";
import { 같은사이트요청인가 } from "@/lib/server/origin";
import { 서류읽기, 추출오류, type 파일내용 } from "@/lib/server/openai";
import { 내용형식맞음, 최대글자수, 파일검사 } from "@/lib/upload";

export const maxDuration = 60;

function 오류(상태: number, 안내: string, 코드: string) {
  return NextResponse.json({ 성공: false, 코드, 안내 }, { status: 상태 });
}

export async function POST(요청: Request) {
  // 다른 웹사이트가 방문자의 브라우저로 몰래 부르는 것을 막는다. (보조 수단)
  if (!같은사이트요청인가(요청.headers)) {
    return 오류(403, "이 사이트 화면에서만 쓸 수 있어요.", "출처거부");
  }

  let 폼: FormData;
  try {
    폼 = await 요청.formData();
  } catch {
    return 오류(400, "요청을 읽을 수 없어요.", "요청이상");
  }

  // 실제 서류는 어떤 경우에도 처리하지 않는다. (DESIGN §4)
  if (폼.get("모드") !== "가상") {
    return 오류(403, "실제 서류는 자동 추출을 쓸 수 없어요. 값을 직접 입력해 주세요.", "모드거부");
  }

  const 파일 = 폼.get("파일");
  if (!(파일 instanceof File)) return 오류(400, "파일이 없어요.", "파일없음");

  const 검사 = 파일검사({ name: 파일.name, size: 파일.size });
  if (!검사.통과) return 오류(400, 검사.이유, "파일검사실패");
  기록("업로드받음");

  const 이름 = 파일.name.toLowerCase();
  if (이름.endsWith(".hwp")) {
    return 오류(422, "HWP는 아직 읽을 수 없어요. PDF로 변환해서 올려 주세요.", "HWP미지원");
  }
  if (이름.endsWith(".doc")) {
    return 오류(422, "예전 형식(.doc)은 읽을 수 없어요. .docx로 저장하거나 PDF로 변환해서 올려 주세요.", "DOC미지원");
  }

  try {
    const 바이트 = Buffer.from(await 파일.arrayBuffer());
    // 이름만 .pdf인 다른 파일을 AI에 보내지 않도록 내용의 첫 바이트도 확인한다.
    if (!내용형식맞음(파일.name, 바이트.subarray(0, 8))) {
      return 오류(400, "파일 내용이 확장자와 맞지 않아요. 올바른 파일인지 확인해 주세요.", "형식불일치");
    }
    let 내용: 파일내용;
    if (이름.endsWith(".pdf")) {
      내용 = { 종류: "pdf", 바이트 };
    } else if (이름.endsWith(".jpg") || 이름.endsWith(".jpeg")) {
      내용 = { 종류: "이미지", 바이트, 형식: "image/jpeg" };
    } else {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: 바이트 });
      if (value.trim() === "") return 오류(422, "Word 파일에서 글자를 찾지 못했어요.", "글없음");
      if (value.length > 최대글자수) {
        return 오류(422, "Word 파일의 글이 너무 길어요. 필요한 부분만 남기거나 PDF로 변환해서 올려 주세요.", "글너무김");
      }
      내용 = { 종류: "글", 글: value };
    }

    const 원본 = await 서류읽기(내용, 파일.name);
    const 결과 = 추출값정리(원본, 파일.name);
    기록("추출성공");
    return NextResponse.json({ 성공: true, ...결과 });
  } catch (e) {
    기록("추출실패");
    if (e instanceof 추출오류 && e.이유 === "키없음") {
      return 오류(503, "AI 서비스를 쓸 준비가 되어 있지 않아요.", "키없음");
    }
    return 오류(502, "파일에서 값을 읽지 못했어요. 값을 직접 입력해 주세요.", "추출실패");
  }
}
