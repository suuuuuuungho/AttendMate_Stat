import { TIMES } from "./config.js?v=20260704d";
import { apiGet, apiPost, subscribeToSeatChanges } from "./api.js?v=20260704d";
import { renderTimeTabs } from "./time-tabs.js?v=20260704d";
import { GRADE_GROUPS, getGradeGroup, abbreviateClass } from "./grades.js?v=20260704d";

const timeTabsEl = document.getElementById("timeTabs");
const lastUpdatedEl = document.getElementById("lastUpdated");
const refreshBtn = document.getElementById("refreshBtn");
const heroTimeEl = document.getElementById("heroTime");
const totalCountEl = document.getElementById("totalCount");
const statTreeEl = document.getElementById("statTree");
const statTreeEmptyEl = document.getElementById("statTreeEmpty");

const CHEVRON_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// "전체 요약"은 타임 구분 없이 한 번이라도 체크인한 학생을 출석으로 친다 (config.js의
// 실제 타임 값과 절대 겹치지 않도록 특수 토큰을 쓴다).
const ALL_SUMMARY = "__ALL__";
const timeOptions = [{ value: ALL_SUMMARY, label: "전체 요약" }, ...TIMES];

let currentTime = TIMES[0];
let allMembers = [];
// 카드/행을 펼쳐둔 상태는 15초 폴링마다 다시 렌더링해도 유지되도록 key 집합으로 따로 관리한다.
const expandedGrades = new Set();
const expandedClasses = new Set(); // key: `${gradeKey}::${classKey}`

async function loadAllMembers() {
  const res = await apiGet("getAllMembers");
  allMembers = res.members || [];
}
const membersReady = loadAllMembers();

function refreshTabs() {
  renderTimeTabs(timeTabsEl, timeOptions, currentTime, (time) => {
    currentTime = time;
    expandedGrades.clear();
    expandedClasses.clear();
    refreshTabs();
    loadStats();
  });
}

/** "PM 6:26" 형식 — AttendMate 좌석 앱과 동일한 포맷. */
function formatUpdatedTime(date) {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${ampm} ${hours12}:${minutes}`;
}

let activeToastEl = null;
function showToast(text) {
  if (activeToastEl) activeToastEl.remove();
  const el = document.createElement("div");
  el.className = "toast toast--processing";
  el.textContent = text;
  document.body.appendChild(el);
  activeToastEl = el;
  return {
    complete(msg) {
      el.className = "toast toast--success";
      el.textContent = msg;
      setTimeout(() => {
        if (activeToastEl === el) activeToastEl = null;
        el.remove();
      }, 1800);
    },
    fail(msg) {
      el.className = "toast toast--error";
      el.textContent = msg;
      setTimeout(() => {
        if (activeToastEl === el) activeToastEl = null;
        el.remove();
      }, 2500);
    },
  };
}

/**
 * "출석 수정" 버튼 전용. 실제 좌석은 고를 수 없는 화면이라 markAttendance는 자리
 * 표식 없이 기록만 남기고, AttendMate 좌석판에는 "자리 미배정" 블록으로 모인다.
 */
async function toggleAttendance(member, attended) {
  const toast = showToast(attended ? "출석 취소 처리 중입니다..." : "출석 처리 중입니다...");
  try {
    const res = attended
      ? await apiPost("cancelAttendance", { 회원ID: member.회원ID, 타임: currentTime })
      : await apiPost("markAttendance", { 회원ID: member.회원ID, 이름: member.이름, 학년반: member.학년반, 타임: currentTime });
    if (res.success) {
      toast.complete(attended ? `${member.이름}님 출석을 취소했습니다` : `${member.이름}님 출석 처리했습니다`);
      loadStats();
    } else {
      toast.fail(res.error || "처리에 실패했습니다.");
    }
  } catch (e) {
    toast.fail("네트워크 오류로 처리에 실패했습니다.");
  }
}

function renderRosterGroup(title, members, attended) {
  const wrap = document.createElement("div");
  wrap.className = "roster-group";

  const heading = document.createElement("div");
  heading.className = "roster-group__heading text-caption-strong";
  heading.textContent = `${title} (${members.length}명)`;
  wrap.appendChild(heading);

  if (!members.length) {
    const none = document.createElement("div");
    none.className = "roster-group__none text-caption";
    none.textContent = "없음";
    wrap.appendChild(none);
    return wrap;
  }

  const showActions = currentTime !== ALL_SUMMARY;
  const sorted = [...members].sort((a, b) => (a.이름 || "").localeCompare(b.이름 || "", "ko"));
  const list = document.createElement("div");
  list.className = "roster-list";
  for (const m of sorted) {
    const item = document.createElement("div");
    item.className = "roster-item";
    const name = document.createElement("span");
    name.className = "roster-item__name text-body";
    name.textContent = m.이름 || "";
    item.appendChild(name);

    if (showActions) {
      const actions = document.createElement("div");
      actions.className = "roster-item__actions";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "roster-action-btn";
      toggleBtn.textContent = attended ? "출석 취소" : "출석 처리";
      toggleBtn.addEventListener("click", () => toggleAttendance(m, attended));
      actions.appendChild(toggleBtn);

      if (m.전화) {
        const callLink = document.createElement("a");
        callLink.className = "roster-action-btn roster-action-btn--link";
        callLink.href = `tel:${m.전화}`;
        callLink.textContent = "전화";
        actions.appendChild(callLink);

        const smsLink = document.createElement("a");
        smsLink.className = "roster-action-btn roster-action-btn--link";
        smsLink.href = `sms:${m.전화}`;
        smsLink.textContent = "문자";
        actions.appendChild(smsLink);
      }

      item.appendChild(actions);
    }

    list.appendChild(item);
  }
  wrap.appendChild(list);
  return wrap;
}

/**
 * 전체 명단을 학년 → 반 단위로 묶고, 각 반은 출석/미출석 학생 목록을 함께 담는다.
 * attendedIds에 없는 학생은 전부 미출석으로 간주한다.
 */
function buildTree(members, attendedIds) {
  const groups = [...GRADE_GROUPS, { key: "other", label: "기타", cssVar: null }];
  const tree = [];

  for (const group of groups) {
    const gradeMembers = members.filter((m) => (getGradeGroup(m.학년반)?.key || "other") === group.key);
    if (!gradeMembers.length) continue;

    const byClass = new Map();
    for (const m of gradeMembers) {
      const classKey = abbreviateClass(m.학년반) || "미분류";
      if (!byClass.has(classKey)) byClass.set(classKey, []);
      byClass.get(classKey).push(m);
    }

    const classes = [...byClass.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ko", { numeric: true }))
      .map(([classKey, classMembers]) => {
        const attended = classMembers.filter((m) => attendedIds.has(m.회원ID));
        const absent = classMembers.filter((m) => !attendedIds.has(m.회원ID));
        return { classKey, total: classMembers.length, attended, absent };
      });

    const totalAttended = gradeMembers.filter((m) => attendedIds.has(m.회원ID)).length;
    tree.push({ key: group.key, label: group.label, cssVar: group.cssVar, total: gradeMembers.length, totalAttended, classes });
  }

  return tree;
}

function renderTree(tree) {
  statTreeEl.innerHTML = "";
  statTreeEmptyEl.style.display = tree.length ? "none" : "block";

  for (const grade of tree) {
    const gradeWrap = document.createElement("div");
    gradeWrap.className = "grade-group";
    if (grade.cssVar) gradeWrap.style.setProperty("--grade-color", `var(${grade.cssVar})`);

    const gradeRow = document.createElement("button");
    gradeRow.type = "button";
    gradeRow.className = "grade-row";
    gradeRow.setAttribute("aria-expanded", String(expandedGrades.has(grade.key)));

    const label = document.createElement("span");
    label.className = "grade-row__label text-body-strong";
    label.textContent = grade.label;

    const count = document.createElement("span");
    count.className = "grade-row__count";
    count.textContent = `${grade.totalAttended}/${grade.total}명`;

    const chevron = document.createElement("span");
    chevron.className = "grade-row__chevron";
    chevron.innerHTML = CHEVRON_SVG;

    gradeRow.append(label, count, chevron);
    gradeRow.addEventListener("click", () => {
      if (expandedGrades.has(grade.key)) expandedGrades.delete(grade.key);
      else expandedGrades.add(grade.key);
      renderTree(tree);
    });
    gradeWrap.appendChild(gradeRow);

    if (expandedGrades.has(grade.key)) {
      const classPanel = document.createElement("div");
      classPanel.className = "class-panel";

      for (const cls of grade.classes) {
        const classKeyFull = `${grade.key}::${cls.classKey}`;
        const classWrap = document.createElement("div");
        classWrap.className = "class-group";

        const classRow = document.createElement("button");
        classRow.type = "button";
        classRow.className = "class-row";
        classRow.setAttribute("aria-expanded", String(expandedClasses.has(classKeyFull)));

        const classLabel = document.createElement("span");
        classLabel.className = "class-row__label text-body on-light";
        classLabel.textContent = cls.classKey;

        const classCount = document.createElement("span");
        classCount.className = "class-row__count";
        classCount.textContent = `${cls.attended.length}/${cls.total}명`;

        const classChevron = document.createElement("span");
        classChevron.className = "class-row__chevron";
        classChevron.innerHTML = CHEVRON_SVG;

        classRow.append(classLabel, classCount, classChevron);
        classRow.addEventListener("click", () => {
          if (expandedClasses.has(classKeyFull)) expandedClasses.delete(classKeyFull);
          else expandedClasses.add(classKeyFull);
          renderTree(tree);
        });
        classWrap.appendChild(classRow);

        if (expandedClasses.has(classKeyFull)) {
          const rosterPanel = document.createElement("div");
          rosterPanel.className = "roster-panel";
          rosterPanel.appendChild(renderRosterGroup("출석학생", cls.attended, true));
          rosterPanel.appendChild(renderRosterGroup("미출석학생", cls.absent, false));
          classWrap.appendChild(rosterPanel);
        }

        classPanel.appendChild(classWrap);
      }

      gradeWrap.appendChild(classPanel);
    }

    statTreeEl.appendChild(gradeWrap);
  }
}

async function loadStats() {
  let attendedMembers;
  if (currentTime === ALL_SUMMARY) {
    const res = await apiGet("getAllAttendance");
    attendedMembers = res.members || [];
  } else {
    const res = await apiGet("getSeats", { time: currentTime });
    attendedMembers = Object.values(res.seats || {});
  }
  await membersReady;

  const attendedIds = new Set(attendedMembers.map((m) => m.회원ID));
  const tree = buildTree(allMembers, attendedIds);

  heroTimeEl.textContent = currentTime === ALL_SUMMARY ? "전체 요약" : currentTime;
  totalCountEl.innerHTML = `<span>${attendedIds.size}</span>명`;
  renderTree(tree);
  lastUpdatedEl.textContent = formatUpdatedTime(new Date()) + " Updated";
}

refreshBtn.addEventListener("click", loadStats);

refreshTabs();
loadStats();
setInterval(loadStats, 15000);
// 좌석 체크 페이지와 동일하게, Log 테이블 변경을 폴링 없이 즉시 반영 (15초 폴링은 안전망으로 유지).
subscribeToSeatChanges(() => loadStats());
