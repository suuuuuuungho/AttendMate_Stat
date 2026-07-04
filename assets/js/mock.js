// Supabase 접속 정보 없는 오프라인 미리보기용 목업 데이터. config.js의 SUPABASE_URL/
// SUPABASE_ANON_KEY가 비어있을 때 api.js가 이 모듈을 대신 사용한다. AttendMate 저장소의 mock.js와 같은 형식.
const TIMES = [
  "7/27(월) 저녁",
  "7/28(화) 오전",
  "7/28(화) 저녁",
  "7/29(수) 오전",
  "7/29(수) 저녁",
  "7/30(목) 오전",
];

function makeSeats(count, gradeCycle) {
  const seats = {};
  for (let i = 1; i <= count; i++) {
    const 학년반 = gradeCycle[i % gradeCycle.length];
    seats["S" + i] = {
      회원ID: "MOCK" + i,
      이름: "학생" + i,
      학년반,
    };
  }
  return seats;
}

const GRADE_CYCLE = [
  "중등부 1학년 1-1반",
  "중등부 1학년 1-2반",
  "중등부 2학년 2-3반",
  "중등부 3학년 3-1반",
  "신입1반",
  "장기섬김",
];

const mockSeatLog = {};
TIMES.forEach((t, i) => {
  mockSeatLog[t] = makeSeats(18 + i * 7, GRADE_CYCLE);
});

export function mockGetSeats(time) {
  return { seats: mockSeatLog[time] || {} };
}

// 학년/반 계층 구조(1학년 1-1~1-6반 등)를 미리보기에서도 확인할 수 있도록 넉넉한 전교생 명단을 만든다.
const ALL_CLASSES = [
  ...[1, 2, 3, 4, 5, 6].map((n) => `중등부 1학년 1-${n}반`),
  ...[1, 2, 3, 4].map((n) => `중등부 2학년 2-${n}반`),
  ...[1, 2].map((n) => `중등부 3학년 3-${n}반`),
  "신입1반",
  "장기섬김",
];

const MOCK_ALL_MEMBERS = [];
ALL_CLASSES.forEach((cls, ci) => {
  const perClass = 6 + (ci % 4);
  for (let i = 1; i <= perClass; i++) {
    MOCK_ALL_MEMBERS.push({
      회원ID: `MOCK-${ci}-${i}`,
      이름: `학생${ci}${i}`,
      학년반: cls,
      전화: "01025895573",
    });
  }
});

export function mockGetAllMembers() {
  return { members: MOCK_ALL_MEMBERS };
}

// 전체 요약: 명단의 60%가량이 최소 한 타임 이상 출석한 것으로 가정한다.
export function mockGetAllAttendance() {
  const members = MOCK_ALL_MEMBERS.filter((_, i) => i % 5 !== 0);
  return { members };
}

// "출석 수정" 버튼 미리보기용 — 실제 Supabase 없이도 동작을 확인할 수 있게 메모리에만 반영한다.
const mockManualAttendance = new Set(); // `${회원ID}::${타임}`

export function mockMarkAttendance({ 회원ID, 타임 }) {
  mockManualAttendance.add(`${회원ID}::${타임}`);
  return { success: true };
}

export function mockCancelAttendance({ 회원ID, 타임 }) {
  mockManualAttendance.delete(`${회원ID}::${타임}`);
  return { success: true };
}
