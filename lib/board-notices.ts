export interface BoardNotice {
  key: string;
  category: "all" | "community" | "life" | "education" | "market" | "jobs";
  title: string;
  intro: string;
  points: string[];
  caution?: string;
}

export const BOARD_NOTICES: readonly BoardNotice[] = [
  {
    key: "community",
    category: "community",
    title: "자유게시판에 오신 것을 환영합니다",
    intro: "독일에서 살아가며 나누고 싶은 일상, 소식, 질문과 이야기를 편하게 나누는 공간입니다.",
    points: ["가벼운 일상과 경험담도 환영합니다.", "서로 다른 경험과 의견을 존중해주세요.", "개인정보가 드러나는 자료는 올리지 말아주세요."],
  },
  {
    key: "life",
    category: "life",
    title: "생활정보 게시판 이용 안내",
    intro: "독일 정착과 생활에서 직접 겪은 정보와 질문을 나누는 게시판입니다.",
    points: ["지역에 따라 다른 정보는 도시·지역을 함께 적어주세요.", "가격·규정·행정정보는 확인한 시점도 함께 적으면 도움이 됩니다.", "공식 절차가 중요한 내용은 GermanHanguk 생활가이드와 기관 최신 안내도 함께 확인해주세요."],
  },
  {
    key: "education",
    category: "education",
    title: "유학·교육 게시판에 오신 것을 환영합니다",
    intro: "독일 유학을 준비하는 분부터 재학생, 졸업·취업을 준비하는 분까지 경험과 정보를 이어주는 공간입니다.",
    points: ["유학 준비·입학·어학·학교생활·비자·WG·생활비·Werkstudent·인턴·졸업과 진로 이야기를 나눠주세요.", "유학생 일기로 시행착오와 소소한 일상을 남겨주셔도 좋습니다.", "질문에는 학교·과정·도시 등 답변에 필요한 상황을 가능한 범위에서 적어주세요."],
    caution: "여권·비자·계좌번호 등 민감한 개인정보는 게시하지 말고, 중요한 행정 결정은 공식 기관의 최신 안내를 확인해주세요.",
  },
  {
    key: "market",
    category: "market",
    title: "사고팔고 게시판 이용 및 안전거래 안내",
    intro: "독일 생활에 필요한 물건을 교민끼리 사고팔거나 나눔할 수 있는 공간입니다.",
    points: ["제목과 본문에 품목·가격·상태를 분명히 적어주세요.", "직거래라면 거래 가능한 지역을 정확히 표시해주세요.", "고액 선입금이나 외부 메신저만을 고집하는 거래는 특히 주의해주세요."],
    caution: "GermanHanguk은 거래 당사자가 아니므로 송금 전 상대방과 물품·거래조건을 직접 확인해주세요.",
  },
  {
    key: "jobs",
    category: "jobs",
    title: "구인·구직 게시판 이용 안내",
    intro: "독일 내 채용, 아르바이트, Werkstudent, 인턴과 구직 정보를 나누는 공간입니다.",
    points: ["구인글에는 근무지·업무·고용형태·근무시간·지원방법을 구체적으로 적어주세요.", "가능하면 급여 또는 급여 범위를 투명하게 안내해주세요.", "구직자는 연락처·체류서류 등 개인정보를 공개 게시물에 과도하게 노출하지 마세요."],
  },
  {
    key: "all",
    category: "all",
    title: "GermanHanguk 커뮤니티 이용 안내",
    intro: "독일에서 살아가는 한국인과 독일 생활을 준비하는 분들이 서로의 경험을 연결하는 공간입니다.",
    points: ["게시판 성격에 맞는 카테고리를 선택하면 필요한 답변을 더 빨리 받을 수 있습니다.", "질문과 경험담 모두 환영하며, 서로에게 도움이 되는 편안한 분위기를 함께 만들어주세요.", "각 게시판에 들어가면 해당 공간의 이용 안내 공지를 확인할 수 있습니다."],
  },
] as const;

export function getBoardNotice(category: string): BoardNotice {
  return BOARD_NOTICES.find((notice) => notice.category === category)
    || BOARD_NOTICES.find((notice) => notice.category === "all")!;
}
