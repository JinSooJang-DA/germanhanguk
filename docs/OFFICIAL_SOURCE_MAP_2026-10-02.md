# GermanHanguk 공식 자료 연결 맵

검증일: 2026-10-02

목적: GermanHanguk의 설명 콘텐츠에서 사용자가 실제 행정·학업 업무를 처리할 수 있는 공식 사이트로 바로 이동하도록 연결한다. 우선순위는 정부·공공기관·법정/공식 운영기관이며, 민간 블로그나 검색 결과 페이지는 핵심 출처로 사용하지 않는다.

## 1차 확정 동선

| 사용자 목적 | GermanHanguk 진입점 | 공식 목적지 | 사용 방식 |
|---|---|---|---|
| 거주지 등록 Anmeldung | 독일생활 바로가기 / 정착 | Bundesportal `Wohnsitz anmelden` | 지역 선택 후 관할 기관·온라인/방문 절차로 이동 |
| 세금 신고·Finanzamt 전자업무 | 세금 허브 | Mein ELSTER | 세금신고, 신청, 메시지 등 실제 전자업무로 이동 |
| 독일 대학·전공 찾기 | 유학생 허브 / 교육 | Hochschulkompass Studiengangsuche | 대학·학위·전공·지원 제한 등을 공식 데이터로 검색 |
| 대학 정보의 신뢰성 확인 | 유학생 허브 / 교육 | Hochschulkompass | 대학이 직접 등록·갱신하는 최신 학과 데이터의 기준 출처 |
| 유학생 건강보험 | 유학생 허브 / 보험 | Deutsches Studierendenwerk | 등록 시 보험 증명, 학생보험 기본 구조 확인 |
| 유학생 주거·생활 지원 | 유학생 허브 / 주거 | Deutsches Studierendenwerk | 지역 Studierendenwerk와 기숙사·상담·생활지원 연결 |

## 공식 URL

- Bundesportal Wohnsitz anmelden: https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99115005104000
- ELSTER Privatpersonen: https://www.elster.de/elsterweb/infoseite/privatpersonen?locale=de_DE
- Hochschulkompass Studiengangsuche: https://www.hochschulkompass.de/studium/studiengangsuche.html
- Hochschulkompass 소개/데이터 성격: https://www.hochschulkompass.de/ueber-uns.html
- Deutsches Studierendenwerk 유학생 서비스: https://www.studierendenwerke.de/en/topics/international-students/services-for-international-students
- Deutsches Studierendenwerk 학생 건강보험: https://www.studierendenwerke.de/en/topics/student-finance/costs-of-study/insurances-for-students/studienvoraussetzung-kranken-und-pflegeversicherung

## 적용 원칙

1. GermanHanguk 본문은 한국어로 절차를 풀어 설명하고, CTA는 사용자가 실제 업무를 처리하는 공식 페이지로 보낸다.
2. Bundesportal처럼 지역별 절차가 달라지는 서비스는 특정 도시 URL을 고정하지 않고 먼저 지역을 선택할 수 있는 전국 단위 페이지를 사용한다.
3. 대학·학과 검색은 Hochschulkompass를 기본 검색 출처로 두고, 외국인 지원자에게 필요한 입학자격·언어·비자 설명은 DAAD/공식 정부 출처를 보조 출처로 붙인다.
4. 유학생 생활지원은 개별 민간 서비스보다 Deutsches Studierendenwerk 및 지역 Studierendenwerk로 연결한다.
5. 링크는 `설명 → 준비물/조건 → 공식 사이트에서 처리` 순서로 배치하고, 단순 출처 목록과 실제 업무 CTA를 구분한다.

## 다음 조사 묶음

- 비자·체류허가: Auswärtiges Amt / BAMF / Make it in Germany의 역할 분리
- 취업·구직·실업: Bundesagentur für Arbeit
- Rundfunkbeitrag: 공식 Beitragsservice
- 운전면허·차량: Bundesportal 및 지역 Zulassungsstelle
- Kindergeld·Elterngeld: Familienportal / Bundesagentur für Arbeit
- 학력 인정·대학입학자격: anabin / DAAD admission database / 대학별 최종 판단 경로
- 대학 지원: uni-assist / Hochschulstart / 대학 직접지원 구분
- 학생 주거: 지역 Studierendenwerk 검색 동선

## 2차 검증 완료

| 사용자 목적 | 공식 목적지 | 비고 |
|---|---|---|
| 유학 비자·체류 | Make it in Germany `Visa for studying` | 연방정부 공식 포털. §16b 체류, 재정증명, 학업 중 취업 범위 등 유학생 핵심 동선 |
| 비자 종류 탐색 | Make it in Germany `Types of visa` | 유학·취업·Ausbildung·가족 등 목적별 분기용 |
| 방송분담금 신규 등록 | Beitragsservice `Anmelden` | Wohnung 신규 등록 온라인 양식으로 연결 |

- 유학 비자: https://www.make-it-in-germany.com/en/visa-residence/types/studying
- 비자 종류: https://www.make-it-in-germany.com/en/visa-residence/types
- Rundfunkbeitrag 등록: https://www.rundfunkbeitrag.de/anmelden

메모: 비자/체류 관련 금액·허용 근로일수처럼 연도별로 바뀌는 숫자는 GermanHanguk에 하드코딩할 경우 `last_verified_at` 검증 대상으로 관리한다.