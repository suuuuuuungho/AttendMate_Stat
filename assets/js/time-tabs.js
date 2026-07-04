// AttendMate 좌석 앱과 동일한 타임 선택 드롭다운 렌더러.
// times 항목은 문자열이거나 {value, label} 객체일 수 있다 ("전체 요약"처럼 실제 값과
// 화면 표시 라벨이 다른 특수 옵션을 넣기 위함).
export function renderTimeTabs(container, times, current, onSelect) {
  if (!container._timeSelectBound) {
    container.innerHTML = '<select class="time-select"></select>';
    const select = container.querySelector("select");
    select.addEventListener("change", (e) => onSelect(e.target.value));
    container._timeSelectBound = true;
  }

  const options = times.map((t) => (typeof t === "string" ? { value: t, label: t } : t));
  const key = options.map((o) => o.value).join(",");
  const select = container.querySelector("select");
  if (select.dataset.times !== key) {
    select.innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
    select.dataset.times = key;
  }
  select.value = current;
}
