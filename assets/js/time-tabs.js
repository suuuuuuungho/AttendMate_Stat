// AttendMate 좌석 앱과 동일한 타임 선택 드롭다운 렌더러.
export function renderTimeTabs(container, times, current, onSelect) {
  if (!container._timeSelectBound) {
    container.innerHTML = '<select class="time-select"></select>';
    const select = container.querySelector("select");
    select.addEventListener("change", (e) => onSelect(e.target.value));
    container._timeSelectBound = true;
  }

  const select = container.querySelector("select");
  if (select.dataset.times !== times.join(",")) {
    select.innerHTML = times.map((t) => `<option value="${t}">${t}</option>`).join("");
    select.dataset.times = times.join(",");
  }
  select.value = current;
}
