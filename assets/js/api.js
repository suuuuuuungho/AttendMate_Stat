import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js?v=20260704b";
import { mockGetSeats } from "./mock.js?v=20260704b";

const USE_MOCK = !SUPABASE_URL || !SUPABASE_ANON_KEY;
const supabase = USE_MOCK ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 통계 페이지는 읽기 전용이라 GET만 필요하다.
export async function apiGet(action, params = {}) {
  if (USE_MOCK) return mockGet(action, params);
  if (action === "getSeats") return getSeats(params.time);
  return { error: "알 수 없는 action: " + action };
}

/** AttendMate의 좌석 체크와 동일한 Log 테이블을 구독해 통계도 실시간으로 갱신한다. */
export function subscribeToSeatChanges(onChange) {
  if (USE_MOCK) return () => {};
  const channel = supabase
    .channel("log-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "Log" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

function mockGet(action, params) {
  if (action === "getSeats") return mockGetSeats(params.time);
  return { error: "알 수 없는 action: " + action };
}

async function getSeats(time) {
  if (!time) return { seats: {} };
  const { data, error } = await supabase.from("Log").select("ID,Name,Division,Seat,Time").eq("Time", time);
  if (error) return { seats: {} };
  const seats = {};
  for (const row of data || []) {
    seats[row.Seat] = { 회원ID: String(row.ID), 이름: row.Name, 학년반: row.Division };
  }
  return { seats };
}
