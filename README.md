# AttendMate_Stat

AttendMate 좌석 체크 앱과 같은 Google Sheet(Apps Script)를 읽기 전용으로 사용하는 출석 통계 페이지.
타임(회차)을 선택하면 전체 출석 인원, 학년별/반별 출석 인원과 명단을 볼 수 있다.

- 백엔드: AttendMate 저장소의 Apps Script(`getSeats` 액션)를 그대로 재사용. 이 프로젝트는 별도 배포가 없다.
- 디자인: AttendMate와 동일한 Apple-design-analysis 토큰 세트(`tokens.css`/`base.css`/`components.css`) + 통계 페이지 전용 포인트 컬러(`--color-accent-2`, 틸)와 `stats.css`.
- `assets/js/config.js`의 `APPS_SCRIPT_URL`/`TIMES`는 AttendMate 저장소의 값과 항상 같게 유지해야 한다.

## 로컬 미리보기

```
python -m http.server 8090
```
