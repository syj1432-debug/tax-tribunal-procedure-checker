// 수정한 내용을 검사 → 커밋 → GitHub 푸시 → Vercel 재배포 → 배포 확인까지 한 번에 하는 스크립트
// 사용법: npm run ship -- "한국어 한 줄 커밋 메시지"
//
// 안전 장치
//  - 검사(npm run check: 타입·ESLint·시험·빌드)가 하나라도 실패하면 커밋·푸시·배포를 하지 않는다.
//  - .env 같은 비밀 파일이 스테이징되거나 비밀 값이 들어 있으면 멈춘다. (커밋 전에 검사)
//  - 토큰은 .env에서 읽어 임시로만 쓰고, 화면·로그·저장소 설정에 남기지 않는다. 출력에서 값은 *** 로 가린다.
//  - 강제 푸시(--force)는 하지 않는다.
//  - .bkit/ 은 올리지 않는다.
// 이 스크립트에는 비밀 값이 없다. (공개 저장소에 올라가도 안전하다)

import cp from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const 저장소 = "syj1432-debug/tax-tribunal-procedure-checker";
const 접속주소 = "https://tax-tribunal-procedure-checker.vercel.app";
const 앱제목 = "조세심판 절차적 요건 점검기";
const 공동작성 = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>";

// ── .env 읽기 (값은 화면에 내지 않는다) ──
const 환경 = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((줄) => 줄.includes("=") && !줄.startsWith("#"))
    .map((줄) => [줄.split("=")[0], 줄.slice(줄.indexOf("=") + 1).trim()]),
);
const 비밀값들 = Object.values(환경).filter((값) => 값.length >= 8);
const 가리기 = (글) => 비밀값들.reduce((결과, 값) => 결과.split(값).join("***"), 글 ?? "");

function 실행(명령, 인자, 옵션 = {}) {
  const 결과 = cp.spawnSync(명령, 인자, { encoding: "utf8", shell: 옵션.셸 ?? false, maxBuffer: 1 << 28, ...옵션 });
  return { 코드: 결과.status, 출력: 가리기((결과.stdout ?? "") + (결과.stderr ?? "")) };
}
const git = (...인자) => 실행("git", 인자);

function 중단(이유) {
  console.error(`\n❌ 중단: ${이유}`);
  process.exit(1);
}
function 단계(글) {
  console.log(`\n▶ ${글}`);
}

const 메시지 = process.argv.slice(2).join(" ").trim();
if (!메시지) 중단('커밋 메시지가 필요합니다. 예: npm run ship -- "점검 결과 화면 문구 수정"');
if (메시지.includes("\n")) 중단("커밋 메시지는 한 줄이어야 합니다.");

// 1) 바뀐 것 확인
단계("1/6 바뀐 파일 확인");
const 상태 = git("status", "--porcelain", "--", ".", ":!.bkit").출력.trim();
const 안올린 = Number(git("rev-list", "--count", "origin/main..HEAD").출력.trim() || 0);
if (!상태 && 안올린 === 0) {
  console.log("커밋할 변경도, 올리지 않은 커밋도 없습니다. 현재 배포 상태만 확인합니다.");
}
console.log(상태 ? 상태 : "(커밋할 변경 없음)", 안올린 ? `\n올리지 않은 커밋 ${안올린}개` : "");

// 2) 검사
단계("2/6 검사 (타입·ESLint·시험·빌드)");
if (상태 || 안올린) {
  const 검사 = 실행("npm.cmd", ["run", "check"], { 셸: true });
  if (검사.코드 !== 0) {
    console.error(검사.출력.split("\n").slice(-25).join("\n"));
    중단("검사가 실패했습니다. 고친 뒤 다시 실행하세요. (커밋·푸시·배포 안 함)");
  }
  console.log("검사 통과:", (검사.출력.match(/Tests\s+[^\n]+/) ?? [""])[0].trim());
}

// 3) 비밀 검사 + 커밋
단계("3/6 비밀 값 검사 후 커밋");
if (상태) {
  git("add", "-A", "--", ".", ":!.bkit");
  const 올릴파일 = git("diff", "--cached", "--name-only").출력.split("\n").filter(Boolean);
  const 위험이름 = 올릴파일.filter((f) => /(^|\/)\.env/.test(f) || /\.(pem|key)$/.test(f) || /^node_modules\//.test(f));
  if (위험이름.length) {
    git("reset", "-q");
    중단(`올리면 안 되는 파일이 포함됨: ${위험이름.join(", ")}`);
  }
  const 노출 = 올릴파일.filter((f) => {
    try {
      const 내용 = fs.readFileSync(f);
      const 글 = 내용.toString("latin1");
      return 비밀값들.some((값) => 내용.includes(값) || 글.includes(값));
    } catch {
      return false;
    }
  });
  if (노출.length) {
    git("reset", "-q");
    중단(`비밀 값이 들어 있는 파일이 있습니다: ${노출.join(", ")}`);
  }
  const 임시 = path.join(os.tmpdir(), `ship-msg-${Date.now()}.txt`);
  fs.writeFileSync(임시, `${메시지}\n\n${공동작성}\n`, "utf8");
  const 커밋 = git("commit", "-q", "-F", 임시);
  fs.rmSync(임시, { force: true });
  if (커밋.코드 !== 0) 중단(`커밋 실패: ${커밋.출력.slice(0, 300)}`);
  console.log("커밋:", git("log", "--oneline", "-1").출력.trim());
} else {
  console.log("새로 커밋할 변경 없음");
}

// 4) 푸시
단계("4/6 GitHub 푸시");
if (!환경.GITHUB_TOKEN) 중단(".env에 GITHUB_TOKEN이 없습니다.");
const 인증 = Buffer.from(`x-access-token:${환경.GITHUB_TOKEN}`).toString("base64");
const 푸시 = 실행("git", ["-c", `http.extraheader=AUTHORIZATION: basic ${인증}`, "push", "--no-progress", "origin", "master:main"]);
const 푸시출력 = 푸시.출력.split(인증).join("***");
if (푸시.코드 !== 0) 중단(`푸시 실패 (강제 푸시는 하지 않습니다): ${푸시출력.slice(0, 400)}`);
const 머리 = git("rev-parse", "--short", "HEAD").출력.trim();
console.log("푸시 완료:", 푸시출력.trim().split("\n").slice(-1)[0]);

// 5) Vercel 재배포
단계("5/6 Vercel 재배포 (production)");
if (!환경.VERCEL_TOKEN) 중단(".env에 VERCEL_TOKEN이 없습니다.");
const 배포 = 실행("npx.cmd", ["--yes", "vercel@latest", "deploy", "--prod", "--yes"], {
  셸: true,
  env: { ...process.env, VERCEL_TOKEN: 환경.VERCEL_TOKEN, NO_COLOR: "1", CI: "1" },
  timeout: 540_000,
});
const 배포JSON = (() => {
  const 조각 = 배포.출력.match(/\{[\s\S]*"deployment"[\s\S]*?\n\}/);
  try {
    return 조각 ? JSON.parse(조각[0]) : null;
  } catch {
    return null;
  }
})();
if (배포.코드 !== 0 || !배포JSON) {
  console.error(배포.출력.split("\n").slice(-15).join("\n"));
  중단("Vercel 배포 실패 (GitHub에는 이미 올라갔습니다)");
}
console.log("배포 상태:", 배포JSON.deployment.readyState, "| 대상:", 배포JSON.deployment.target);

// 6) 배포 확인
단계("6/6 배포 확인");
const 응답 = await fetch(`${접속주소}/`, { cache: "no-store" });
const 화면 = await 응답.text();
const 제목 = 화면.includes(앱제목);
const 폼 = new FormData();
폼.append("모드", "실제");
폼.append("파일", new Blob(["x"]), "a.pdf");
const 모드거부 = (await fetch(`${접속주소}/api/extract`, { method: "POST", body: 폼 })).status === 403;
const 원격 = await fetch(`https://api.github.com/repos/${저장소}/commits/main`, {
  headers: { Authorization: `Bearer ${환경.GITHUB_TOKEN}`, "User-Agent": "ship" },
});
const 원격내용 = await 원격.json().catch(() => ({}));
const 원격해시 = String(원격내용.sha ?? "").slice(0, 7);
const 결과표 = [
  ["GitHub main = 내 최신 커밋", 원격해시 === 머리],
  ["Vercel 배포 READY", 배포JSON.deployment.readyState === "READY"],
  ["접속 주소 HTTP 200", 응답.status === 200],
  ["앱 제목 보임", 제목],
  ["실제 모드 요청 거부(403)", 모드거부],
];
for (const [이름, 통과] of 결과표) console.log(`${통과 ? "✅" : "❌"} ${이름}`);
console.log(`\n커밋 ${머리} | 접속 주소: ${접속주소} | 저장소: https://github.com/${저장소}`);
if (결과표.some(([, 통과]) => !통과)) 중단("확인 항목 중 실패가 있습니다.");
console.log("\n🎉 커밋·푸시·재배포·확인 모두 끝났습니다.");
