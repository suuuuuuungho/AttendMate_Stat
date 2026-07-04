import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js?v=20260704d";
import {
  mockGetSeats,
  mockGetAllMembers,
  mockGetAllAttendance,
  mockMarkAttendance,
  mockCancelAttendance,
} from "./mock.js?v=20260704d";

const USE_MOCK = !SUPABASE_URL || !SUPABASE_ANON_KEY;
const supabase = USE_MOCK ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 통계 페이지에서 "출석 수정"으로 출석 처리할 때 실제 좌석 없이 기록하기 위한 표식 —
// AttendMate 좌석판은 이 접두어로 시작하는 Seat 값을 실제 좌석 버튼으로 그리지 않고,
// 대신 "자리는 미배정된 학생들" 블록에 모아서 나중에 진짜 좌석을 배정할 수 있게 한다.
export const UNASSIGNED_SEAT_PREFIX = "UNASSIGNED-";

function toMember(row) {
  return { 회원ID: String(row.ID), 이름: row.Name, 학년반: row.Division, 전화: row.Phone || "" };
}

// supabase-js도 PostgREST 기본 1000행 제한을 그대로 받으므로 명시적으로 페이지를
// 나눠 다 받는다 (실제 회원이 1487명이라 뒤쪽 487명 — 교사 다수 포함 — 이 잘렸었다).
const PAGE_SIZE = 1000;
async function fetchAllRows(table, select, eqFilter) {
  let all = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (eqFilter) query = query.eq(eqFilter[0], eqFilter[1]);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export async function apiGet(action, params = {}) {
  if (USE_MOCK) return mockGet(action, params);
  if (action === "getSeats") return getSeats(params.time);
  if (action === "getAllMembers") return getAllMembers();
  if (action === "getAllAttendance") return getAllAttendance();
  return { error: "알 수 없는 action: " + action };
}

/** "출석 수정" 버튼 전용 — 실제 좌석 배정 없이 출석/미출석만 토글한다. */
export async function apiPost(action, body) {
  if (USE_MOCK) return mockPost(action, body);
  if (action === "markAttendance") return markAttendance(body);
  if (action === "cancelAttendance") return cancelAttendance(body);
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

function mockPost(action, body) {
  if (action === "markAttendance") return mockMarkAttendance(body);
  if (action === "cancelAttendance") return mockCancelAttendance(body);
  return { error: "알 수 없는 action: " + action };
}

async function getSeats(time) {
  if (!time) return { seats: {} };
  try {
    const data = await fetchAllRows("Log", "ID,Name,Division,Seat,Time", ["Time", time]);
    const seats = {};
    for (const row of data) {
      seats[row.Seat] = toMember(row);
    }
    return { seats };
  } catch (e) {
    return { seats: {} };
  }
}

/** 전체 회원 명단 — 학년/반별로 미출석자를 가려내려면 출석 기록만으로는 부족해서 필요하다. */
async function getAllMembers() {
  try {
    const data = await fetchAllRows("Member", "ID,Name,Division,Phone");
    return { members: data.map(toMember) };
  } catch (e) {
    return { members: [] };
  }
}

/** "전체 요약" 전용: 타임 구분 없이 한 번이라도 체크인한 학생 집합(회원ID로 중복 제거). */
async function getAllAttendance() {
  try {
    const data = await fetchAllRows("Log", "ID,Name,Division");
    const byId = new Map();
    for (const row of data) {
      byId.set(String(row.ID), toMember(row));
    }
    return { members: [...byId.values()] };
  } catch (e) {
    return { members: [] };
  }
}

/**
 * 통계 페이지에서 미출석 학생을 "출석 처리"할 때 쓴다. 실제 좌석을 고를 수 없는
 * 화면이라 회원ID로 고유한 자리표식(UNASSIGNED-<ID>)을 넣어 (Time,Seat) 유일성
 * 제약과 충돌하지 않게 한다 — AttendMate 좌석판은 이 표식을 실제 좌석으로 그리지
 * 않고 "자리 미배정" 블록에 모아 보여준다.
 */
async function markAttendance({ 회원ID, 이름, 학년반, 타임 }) {
  if (!회원ID || !타임) return { success: false, error: "필수 값이 없습니다 (회원ID/타임)" };
  const { error } = await supabase.from("Log").insert({
    ID: Number(회원ID),
    Name: 이름,
    Division: 학년반,
    Seat: UNASSIGNED_SEAT_PREFIX + 회원ID,
    Time: 타임,
    Timestamp: new Date().toISOString(),
  });
  if (!error) return { success: true };
  if (error.code === "23505") return { success: false, error: "이미 출석 처리되어 있습니다" };
  return { success: false, error: error.message };
}

/** 통계 페이지에서 출석한 학생을 "출석 취소"할 때 쓴다 — 실제 좌석이 있어도 그대로 기록만 지운다. */
async function cancelAttendance({ 회원ID, 타임 }) {
  if (!회원ID || !타임) return { success: false, error: "필수 값이 없습니다 (회원ID/타임)" };
  const { data, error } = await supabase.from("Log").delete().eq("ID", Number(회원ID)).eq("Time", 타임).select();
  if (error) return { success: false, error: error.message };
  if (!data || !data.length) return { success: false, error: "출석 기록을 찾을 수 없습니다" };
  return { success: true };
}
