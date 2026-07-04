# AttendMate_Stat

AttendMate 좌석 체크 앱과 같은 Supabase 프로젝트를 읽기 전용으로 사용하는 출석 통계 페이지.
타임(회차)을 선택하면 전체 출석 인원, 학년별/반별 출석 인원과 명단을 볼 수 있다.

- 백엔드: AttendMate와 같은 Supabase `Log` 테이블을 직접 조회(읽기 전용). Log 테이블 변경은 Realtime 구독으로 즉시 반영되고, 15초 폴링이 안전망으로 함께 동작한다. 이 프로젝트는 별도 배포가 없다.
- 디자인: AttendMate와 동일한 Apple-design-analysis 토큰 세트(`tokens.css`/`base.css`/`components.css`) + 통계 페이지 전용 포인트 컬러(`--color-accent-2`, 틸)와 `stats.css`.
- `assets/js/config.js`의 `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`TIMES`는 AttendMate 저장소의 값과 항상 같게 유지해야 한다.

## 로컬 미리보기

```
python -m http.server 8090
```
