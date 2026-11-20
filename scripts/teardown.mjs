// 배포와 저장소를 내리는(폐기하는) 스크립트
// 사용법:
//   npm run teardown                      → 무엇이 지워질지 보여 주기만 한다 (아무것도 지우지 않음)
//   npm run teardown -- --실행 폐기확인    → 실제로 지운다 (되돌릴 수 없음)
//
// 안전 장치
//  - 기본은 "미리보기"다. 실행하려면 --실행 폐기확인 을 정확히 붙여야 한다.
//  - 지우는 것은 Vercel 프로젝트(배포 주소)와 GitHub 저장소뿐이다. 내 컴퓨터의 파일은 건드리지 않는다.
//  - 토큰은 .env에서 읽어 쓰고 화면에 내지 않는다.
//  - GitHub 토큰에 저장소 삭제 권한이 없으면, 삭제 대신 직접 지우는 주소를 알려 준다.
// 이 스크립트에는 비밀 값이 없다.

import fs from "node:fs";

const 저장소 = "syj1432-debug/tax-tribunal-procedure-checker";
const 프로젝트 = "tax-tribunal-procedure-checker";
const 팀 = "test11-af0f";

const 환경 = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((줄) => 줄.includes("=") && !줄.startsWith("#"))
    .map((줄) => [줄.split("=")[0], 줄.slice(줄.indexOf("=") + 1).trim()]),
);

const 인자 = process.argv.slice(2);
const 실제실행 = 인자[0] === "--실행" && 인자[1] === "폐기확인";

console.log(`\n폐기 대상\n  1) Vercel 프로젝트: ${프로젝트} (팀 ${팀}) → 접속 주소가 사라집니다\n  2) GitHub 저장소: ${저장소} → 코드·PRD·PLAN 공개본이 사라집니다\n  (내 컴퓨터의 my-app 폴더는 그대로 남습니다)`);

if (!실제실행) {
  console.log('\n미리보기만 했습니다. 지우지 않았습니다.\n실제로 지우려면: npm run teardown -- --실행 폐기확인\n※ 되돌릴 수 없습니다.');
  process.exit(0);
}

// 1) Vercel 프로젝트 삭제
if (!환경.VERCEL_TOKEN) {
  console.error("❌ .env에 VERCEL_TOKEN이 없습니다.");
  process.exit(1);
}
const 베르셀 = await fetch(`https://api.vercel.com/v9/projects/${프로젝트}?slug=${팀}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${환경.VERCEL_TOKEN}` },
});
console.log(베르셀.status === 204 || 베르셀.status === 200 ? "✅ Vercel 프로젝트 삭제됨" : `❌ Vercel 삭제 실패 (HTTP ${베르셀.status}) — 이미 없거나 권한 부족`);

// 2) GitHub 저장소 삭제
if (!환경.GITHUB_TOKEN) {
  console.error("❌ .env에 GITHUB_TOKEN이 없습니다.");
  process.exit(1);
}
const 깃허브 = await fetch(`https://api.github.com/repos/${저장소}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${환경.GITHUB_TOKEN}`, "User-Agent": "teardown" },
});
if (깃허브.status === 204) {
  console.log("✅ GitHub 저장소 삭제됨");
} else {
  console.log(`❌ GitHub 삭제 실패 (HTTP ${깃허브.status}) — 토큰에 삭제 권한이 없을 수 있습니다.\n   직접 지우기: https://github.com/${저장소}/settings → 맨 아래 Delete this repository`);
}

console.log("\n끝났습니다. 접속 주소가 열리지 않는지 확인하세요. (.env의 키는 이 도구가 지우지 않습니다. 필요하면 키 재발급·폐기도 하세요)");
