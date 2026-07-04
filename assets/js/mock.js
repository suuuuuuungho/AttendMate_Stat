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
