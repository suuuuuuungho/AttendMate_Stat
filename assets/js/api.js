import { APPS_SCRIPT_URL } from "./config.js";
import { mockGetSeats } from "./mock.js";

const USE_MOCK = !APPS_SCRIPT_URL;

// 통계 페이지는 읽기 전용이라 GET만 필요하다.
export async function apiGet(action, params = {}) {
  if (USE_MOCK) return mockGet(action, params);

  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  return res.json();
}

function mockGet(action, params) {
  if (action === "getSeats") return mockGetSeats(params.time);
  return { error: "알 수 없는 action: " + action };
}
