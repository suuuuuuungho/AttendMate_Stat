// AttendMate 좌석 앱의 seat-map.js와 동일한 학년/반 파싱 규칙 — 두 프로젝트가 같은
// Sheet의 "학년반" 원문 형식("중등부 N학년 x-y반" / "신입x반" / "장기섬김...")을 공유하므로
// 이 로직도 항상 같은 값으로 맞춰야 한다.

// 학년반 원문은 두 형식이 섞여 있다: 목업/구글시트의 "중등부 1학년 1-1반"과
// 실제 Supabase Member 데이터의 "1-1반"(학년 접두어 없이 숫자-반 형식). 둘 다 매칭한다.
export const GRADE_GROUPS = [
  { key: "grade1", label: "1학년", match: /1학년|^1-\d/, cssVar: "--color-grade-1", tintVar: "--color-grade-1-tint" },
  { key: "grade2", label: "2학년", match: /2학년|^2-\d/, cssVar: "--color-grade-2", tintVar: "--color-grade-2-tint" },
  { key: "grade3", label: "3학년", match: /3학년|^3-\d/, cssVar: "--color-grade-3", tintVar: "--color-grade-3-tint" },
  { key: "new", label: "신입반", match: /신입/, cssVar: "--color-grade-new", tintVar: "--color-grade-new-tint" },
  { key: "longterm", label: "장기섬김", match: /장기섬김/, cssVar: "--color-grade-longterm", tintVar: "--color-grade-longterm-tint" },
];

export function getGradeGroup(cls) {
  if (!cls) return null;
  return GRADE_GROUPS.find((g) => g.match.test(cls)) || null;
}

/** "중등부 1학년 1-1반" 같은 학년반 표기를 "1-1반"으로 축약. */
export function abbreviateClass(cls) {
  if (!cls) return "";
  const parts = String(cls).trim().split(/\s+/);
  return parts[parts.length - 1];
}
