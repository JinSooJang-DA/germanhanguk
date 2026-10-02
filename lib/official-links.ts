export type OfficialLink = {
  title: string;
  description: string;
  href: string;
  source: string;
};

export const LIVING_OFFICIAL_LINKS: readonly OfficialLink[] = [
  {
    title: "주소 등록 (Anmeldung)",
    description: "이사 후 거주지 등록 절차와 관할 행정기관을 확인합니다.",
    href: "https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99115005104000",
    source: "Bundesportal",
  },
  {
    title: "온라인 세무 업무",
    description: "세금신고·신청·세무서 메시지를 온라인으로 처리합니다.",
    href: "https://www.elster.de/elsterweb/infoseite/privatpersonen?locale=de_DE",
    source: "ELSTER",
  },
  {
    title: "비자·체류 가능성 확인",
    description: "취업·유학·Ausbildung 등 목적별 체류 경로를 빠르게 확인합니다.",
    href: "https://www.make-it-in-germany.com/de/visum-aufenthalt/quick-check",
    source: "Make it in Germany",
  },
  {
    title: "통합과정·상담기관 찾기",
    description: "주변 Integrationskurs, 이민상담소와 외국인청을 검색합니다.",
    href: "https://bamf-navi.bamf.de/de/",
    source: "BAMF-NAvI",
  },
];

export const STUDENT_OFFICIAL_LINKS: readonly OfficialLink[] = [
  {
    title: "대학·전공 검색",
    description: "독일 대학이 직접 갱신하는 최신 학과 정보를 검색합니다.",
    href: "https://www.hochschulkompass.de/studium/studiengangsuche.html",
    source: "Hochschulkompass",
  },
  {
    title: "국제학생 전공 탐색",
    description: "수업 언어·학위·지원 마감 등 조건으로 독일 학위과정을 비교합니다.",
    href: "https://www.daad.de/en/studying-in-germany/universities/all-degree-programmes/",
    source: "DAAD",
  },
  {
    title: "uni-assist 지원 절차",
    description: "지원 대학이 uni-assist를 이용할 때 서류·VPD·온라인 지원 절차를 확인합니다.",
    href: "https://www.uni-assist.de/en/how-to-apply/",
    source: "uni-assist",
  },
  {
    title: "Hochschulstart 지원",
    description: "DoSV와 의·치·수의·약학 등 Hochschulstart 대상 지원 절차를 확인합니다.",
    href: "https://www.hochschulstart.de/",
    source: "Hochschulstart",
  },
];
