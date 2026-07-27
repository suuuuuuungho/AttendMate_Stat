// AttendMate(좌석 체크) 앱과 같은 Supabase 프로젝트를 그대로 읽기 전용으로 사용한다.
// TIMES는 AttendMate 저장소의 assets/js/config.js와 같아야 하지만, REGISTRATION_TIME만은
// 예외 — 첫 날 접수는 자리 배치가 필요 없어 AttendMate(좌석판)에는 두지 않는다.
export const SUPABASE_URL = "https://hmczbuzziorgqwgyhati.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_IXVkIRdwEmrEW9Bshsb5dw_okT8thEw";

// "첫 날 접수"는 성회 참석 여부를 세는 다른 타임들과 달리 도착 접수만 기록하는 별도
// 페이지라 "전체 요약"(출석 1회 이상 카운트)에서 항상 제외한다 — getAllAttendance()가 이 값을 쓴다.
export const REGISTRATION_TIME = "첫 날 접수";

// 타임 타이틀은 언제든지 바뀔 수 있음 — AttendMate 쪽과 동일하게 유지할 것(REGISTRATION_TIME 제외).
export const TIMES = [
  REGISTRATION_TIME,
  "7/27(월) 저녁",
  "7/28(화) 오전",
  "7/28(화) 저녁",
  "7/29(수) 오전",
  "7/29(수) 저녁",
  "7/30(목) 오전",
];
