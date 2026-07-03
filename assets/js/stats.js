import { TIMES } from "./config.js";
import { apiGet } from "./api.js";
import { renderTimeTabs } from "./time-tabs.js";
import { GRADE_GROUPS, getGradeGroup, abbreviateClass } from "./grades.js";

const timeTabsEl = document.getElementById("timeTabs");
const lastUpdatedEl = document.getElementById("lastUpdated");
const refreshBtn = document.getElementById("refreshBtn");
const totalCountEl = document.getElementById("totalCount");
const gradeCardsEl = document.getElementById("gradeCards");
const gradeEmptyEl = document.getElementById("gradeEmpty");
const classListEl = document.getElementById("classList");
const classEmptyEl = document.getElementById("classEmpty");

let currentTime = TIMES[0];
// 카드/행을 펼쳐둔 상태는 15초 폴링마다 다시 렌더링해도 유지되도록 key 집합으로 따로 관리한다.
const expandedGrades = new Set();
const expandedClasses = new Set();

function refreshTabs() {
  renderTimeTabs(timeTabsEl, TIMES, currentTime, (time) => {
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

function renderRosterList(members) {
  const list = document.createElement("div");
  list.className = "roster-list";
  const sorted = [...members].sort((a, b) => (a.이름 || "").localeCompare(b.이름 || "", "ko"));
  for (const m of sorted) {
    const item = document.createElement("div");
    item.className = "roster-item";
    const name = document.createElement("span");
    name.className = "roster-item__name text-body";
    name.textContent = m.이름 || "";
    const cls = document.createElement("span");
    cls.className = "roster-item__class text-caption";
    cls.textContent = abbreviateClass(m.학년반);
    item.append(name, cls);
    list.appendChild(item);
  }
  return list;
}

function renderGradeCards(byGrade) {
  gradeCardsEl.innerHTML = "";
  const groups = [...GRADE_GROUPS, { key: "other", label: "기타", cssVar: null }];
  let anyRendered = false;

  for (const group of groups) {
    const bucket = byGrade[group.key];
    if (!bucket || !bucket.members.length) continue;
    anyRendered = true;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "grade-card";
    card.setAttribute("aria-expanded", String(expandedGrades.has(group.key)));
    if (group.cssVar) card.style.setProperty("--grade-color", `var(${group.cssVar})`);

    const label = document.createElement("span");
    label.className = "grade-card__label text-caption-strong on-light";
    label.textContent = group.label;
    const count = document.createElement("span");
    count.className = "grade-card__count";
    count.textContent = bucket.members.length + "명";
    card.append(label, count);

    card.addEventListener("click", () => {
      if (expandedGrades.has(group.key)) expandedGrades.delete(group.key);
      else expandedGrades.add(group.key);
      renderGradeCards(byGrade);
    });

    gradeCardsEl.appendChild(card);

    if (expandedGrades.has(group.key)) {
      const roster = renderRosterList(bucket.members);
      roster.classList.add("grade-card__roster");
      gradeCardsEl.appendChild(roster);
    }
  }

  gradeEmptyEl.style.display = anyRendered ? "none" : "block";
}

function renderClassList(byClass) {
  classListEl.innerHTML = "";
  const classKeys = Object.keys(byClass).sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));

  for (const classKey of classKeys) {
    const bucket = byClass[classKey];
    const wrap = document.createElement("div");

    const row = document.createElement("button");
    row.type = "button";
    row.className = "class-row";
    row.setAttribute("aria-expanded", String(expandedClasses.has(classKey)));

    const label = document.createElement("span");
    label.className = "text-body on-light";
    label.textContent = classKey;

    const right = document.createElement("span");
    right.style.display = "flex";
    right.style.alignItems = "center";
    const count = document.createElement("span");
    count.className = "class-row__count";
    count.textContent = bucket.members.length + "명";
    const chevron = document.createElement("span");
    chevron.className = "class-row__chevron";
    chevron.textContent = "▸";
    right.append(count, chevron);

    row.append(label, right);
    row.addEventListener("click", () => {
      if (expandedClasses.has(classKey)) expandedClasses.delete(classKey);
      else expandedClasses.add(classKey);
      renderClassList(byClass);
    });

    wrap.appendChild(row);
    if (expandedClasses.has(classKey)) {
      wrap.appendChild(renderRosterList(bucket.members));
    }
    classListEl.appendChild(wrap);
  }

  classEmptyEl.style.display = classKeys.length ? "none" : "block";
}

function computeStats(seats) {
  const members = Object.values(seats);
  const byGrade = {};
  const byClass = {};

  for (const m of members) {
    const group = getGradeGroup(m.학년반);
    const gradeKey = group ? group.key : "other";
    (byGrade[gradeKey] || (byGrade[gradeKey] = { members: [] })).members.push(m);

    const classKey = abbreviateClass(m.학년반) || "미분류";
    (byClass[classKey] || (byClass[classKey] = { members: [] })).members.push(m);
  }

  return { total: members.length, byGrade, byClass };
}

async function loadStats() {
  const res = await apiGet("getSeats", { time: currentTime });
  const seats = res.seats || {};
  const { total, byGrade, byClass } = computeStats(seats);

  totalCountEl.textContent = total + "명";
  renderGradeCards(byGrade);
  renderClassList(byClass);
  lastUpdatedEl.textContent = formatUpdatedTime(new Date()) + " Updated";
}

refreshBtn.addEventListener("click", loadStats);

refreshTabs();
loadStats();
setInterval(loadStats, 15000);
