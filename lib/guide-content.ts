export interface GuideAudienceItem {
  title: string;
  description: string;
  targetId: string;
}

export interface GuideExtraContent {
  quickSummary: string[];
  showInsuranceComparison?: boolean;
  showEmployeeSteps?: boolean;
  showStudentSituations?: boolean;
  audience?: GuideAudienceItem[];
}

export const GUIDE_CONTENT: Record<string, GuideExtraContent> = {
  "german-health-insurance-guide": {
    quickSummary: [
      "독일에서는 건강보험 가입이 필요합니다.",
      "GKV는 법정 건강보험(공보험), PKV는 민간 건강보험(사보험)입니다.",
      "직업, 소득, 나이와 가족 상황 등에 따라 가입 조건이 달라질 수 있습니다.",
      "연봉이 높다고 해서 반드시 사보험에 가입해야 하는 것은 아닙니다.",
      "사보험에서 공보험으로 돌아갈 때는 법적 조건이 적용될 수 있습니다.",
    ],

    showInsuranceComparison: true,

    audience: [
      {
        title: "직장인",
        description: "고용 형태와 소득에 따라 확인해야 할 조건이 있습니다.",
        targetId: "employee",
      },
      {
        title: "유학생",
        description: "나이와 학업 상태에 따라 적용 조건이 달라질 수 있습니다.",
        targetId: "student",
      },
      {
        title: "프리랜서",
        description: "보험 선택 전 가입 조건과 비용 구조를 확인하세요.",
        targetId: "freelancer",
      },
      {
        title: "가족",
        description: "배우자와 자녀의 보험 적용 조건을 함께 확인하세요.",
        targetId: "family",
      },
    ],
  },

  "german-employee-health-insurance-guide": {
    quickSummary: [
      "독일에서 취업하면 자신의 건강보험 가입 상태를 먼저 확인해야 합니다.",
      "2026년 일반적인 GKV 의무가입 소득기준(JAEG)은 연 €77,400입니다.",
      "GKV 일반 보험료율은 14.6%이며 Krankenkasse별 추가보험료가 별도로 적용됩니다.",
      "직장인의 GKV 일반 보험료와 추가보험료는 고용주와 근로자가 절반씩 부담합니다.",
      "JAEG를 넘는다고 자동으로 사보험(PKV)에 가입하는 것은 아니며 GKV를 계속 유지할 수도 있습니다.",
    ],

    showEmployeeSteps: true,

    audience: [
      {
        title: "첫 취업",
        description: "건강보험 가입을 어디서부터 시작하는지 확인합니다.",
        targetId: "first-job",
      },
      {
        title: "기준 이하",
        description: "GKV 의무가입 대상인지 확인합니다.",
        targetId: "mandatory-gkv",
      },
      {
        title: "기준 초과",
        description: "GKV 유지와 PKV 선택 조건을 확인합니다.",
        targetId: "above-jaeg",
      },
      {
        title: "이직·연봉변경",
        description: "소득 변화에 따른 보험 상태를 확인합니다.",
        targetId: "job-change",
      },
    ],
  },

  "german-student-health-insurance-guide": {
    quickSummary: [
      "독일 대학 등록 시 건강보험 상태를 증명해야 합니다.",
      "조건을 충족하는 학생은 법정 건강보험의 학생 의무보험(KVdS) 대상이 될 수 있습니다.",
      "부모의 GKV 가족보험은 학업 중인 자녀의 경우 일반적으로 25세까지 가능하지만 소득 등 추가 조건이 있습니다.",
      "학생 GKV 의무보험은 원칙적으로 30세까지 적용되며 특별한 사유가 있으면 예외가 인정될 수 있습니다.",
      "GKV 학생 의무보험 면제를 선택하면 학업 중 되돌리기 어려울 수 있으므로 신청 전에 신중히 확인해야 합니다.",
    ],

    showStudentSituations: true,
  },
};