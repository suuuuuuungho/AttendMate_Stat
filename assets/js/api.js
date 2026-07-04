import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js?v=20260704c";
import { mockGetSeats, mockGetAllMembers, mockGetAllAttendance } from "./mock.js?v=20260704c";

const USE_MOCK = !SUPABASE_URL || !SUPABASE_ANON_KEY;
const supabase = USE_MOCK ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function toMember(row) {
  return { 회원ID: String(row.ID), 이름: row.Name, 학년반: row.Division };
}

// 통계 페이지는 읽기 전용이라 GET만 필요하다.
export async function apiGet(action, params = {}) {
  if (USE_MOCK) return mockGet(action, params);
  if (action === "getSeats") return getSeats(params.time);
  if (action === "getAllMembers") return getAllMembers();
  if (action === "getAllAttendance") return getAllAttendance();
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
  if (action === "getAllMembers") return mockGetAllMembers();
  if (action === "getAllAttendance") return mockGetAllAttendance();
  return { error: "알 수 없는 action: " + action };
}

async function getSeats(time) {
  if (!time) return { seats: {} };
  const { data, error } = await supabase.from("Log").select("ID,Name,Division,Seat,Time").eq("Time", time);
  if (error) return { seats: {} };
  const seats = {};
  for (const row of data || []) {
    seats[row.Seat] = toMember(row);
  }
  return { seats };
}

/** 전체 회원 명단 — 학년/반별로 미출석자를 가려내려면 출석 기록만으로는 부족해서 필요하다. */
async function getAllMembers() {
  const { data, error } = await supabase.from("Member").select("ID,Name,Division");
  if (error) return { members: [] };
  return { members: (data || []).map(toMember) };
}

/** "전체 요약" 전용: 타임 구분 없이 한 번이라도 체크인한 학생 집합(회원ID로 중복 제거). */
async function getAllAttendance() {
  const { data, error } = await supabase.from("Log").select("ID,Name,Division");
  if (error) return { members: [] };
  const byId = new Map();
  for (const row of data || []) {
    byId.set(String(row.ID), toMember(row));
  }
  return { members: [...byId.values()] };
}
