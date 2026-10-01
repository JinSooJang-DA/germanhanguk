export interface GuideSupplement {
  title: string;
  items: string[];
}

const practical = (items: string[]): GuideSupplement => ({
  title: "실전 체크포인트",
  items,
});

export const GUIDE_SUPPLEMENTS: Record<string, GuideSupplement> = {
  "german-tax-overview-guide": practical([
    "Steuer-ID, Steuernummer, Sozialversicherungsnummer는 서로 다른 번호이므로 제출처를 확인하세요.",
    "월급명세서의 Lohnsteuer는 연간 최종세액이 아니라 선납 성격의 원천징수액입니다.",
    "이사·결혼·부업·해외소득처럼 상황이 바뀌면 신고의무와 필요한 Anlage가 달라질 수 있습니다.",
  ]),
  "german-tax-class-guide": practical([
    "Steuerklasse는 주로 월별 Lohnsteuer 계산에 영향을 주며 최종 연간 세액 자체를 정하는 등급표가 아닙니다.",
    "두 곳 이상에서 급여를 받는다면 어느 고용관계가 Steuerklasse VI로 처리되는지 급여명세서에서 확인하세요.",
    "혼인·별거·한부모 요건 등 신분 변화가 있으면 ELSTER 또는 Finanzamt에서 현재 분류를 확인하세요.",
  ]),
  "german-married-tax-class-guide": practical([
    "IV/IV, III/V, IV/IV mit Faktor는 월별 원천징수 배분 방식이 다르므로 순수령액만으로 유불리를 단정하지 마세요.",
    "III/V 또는 Faktor를 선택하면 세금신고 의무가 생기는 경우가 있으므로 §46 EStG 요건도 함께 확인하세요.",
    "Elterngeld·Krankengeld 등 임금대체급여를 계획한다면 Steuerklasse 변경 시점이 다른 제도에 미치는 영향도 따로 확인하세요.",
  ]),
  "german-tax-return-guide": practical([
    "Lohnsteuerbescheinigung, 보험자료, 통근일수, 재택근무일, 업무용 구입비를 연도별 폴더로 모아두면 신고가 빨라집니다.",
    "ELSTER의 자동 불러오기 자료가 완전하다고 가정하지 말고 본인 자료와 금액·기간을 대조하세요.",
    "제출 뒤에는 Steuerbescheid의 인정·불인정 항목과 Rechtsbehelfsbelehrung까지 확인하세요.",
  ]),
  "german-tax-return-obligation-deadline-guide": practical([
    "의무신고(Pflichtveranlagung)인지 자발적 신고(Antragsveranlagung)인지 먼저 구분해야 적용 기한을 정확히 볼 수 있습니다.",
    "Kurzarbeitergeld·Arbeitslosengeld 등 Progressionsvorbehalt 대상 급여가 있었다면 신고의무 가능성을 확인하세요.",
    "Finanzamt가 별도 제출기한을 지정한 편지를 보냈다면 일반 기한보다 그 통지의 기한을 우선 확인하세요.",
  ]),
  "german-work-expenses-tax-guide": practical([
    "Werbungskosten는 단순 지출이 아니라 직업과의 관련성을 설명할 수 있어야 하며 사적 사용분은 구분해야 합니다.",
    "Arbeitsmittel, Fortbildung, Bewerbungskosten, Dienstreise 등은 항목별 인정 방식과 증빙이 다릅니다.",
    "실제 업무비용 합계가 Arbeitnehmer-Pauschbetrag을 넘는지 먼저 계산하면 신고 준비의 우선순위를 잡기 쉽습니다.",
  ]),
  "german-commuting-tax-guide": practical([
    "Entfernungspauschale는 왕복거리가 아니라 Wohnung과 erste Tätigkeitsstätte 사이 편도 거리 기준입니다.",
    "출근일수는 휴가·병가·출장·재택근무일을 제외해 실제 기록과 맞추는 것이 안전합니다.",
    "대중교통 실제 비용이 법정 Pauschale보다 큰 경우 적용 가능한 별도 규정이 있는지 확인하세요.",
  ]),
  "german-home-office-tax-guide": practical([
    "Tagespauschale 대상일과 사무실 출근일을 캘린더에 구분해 두면 연말 계산이 쉬워집니다.",
    "업무용 모니터·책상·소프트웨어 같은 Arbeitsmittel은 Homeoffice-Tagespauschale와 별도 판단 대상일 수 있습니다.",
    "별도 Arbeitszimmer 비용과 Tagespauschale는 요건과 중복 제한이 다르므로 같은 개념으로 처리하지 마세요.",
  ]),
  "german-special-expenses-tax-guide": practical([
    "Vorsorgeaufwendungen, 교회세, 기부금, 교육비 등은 같은 Sonderausgaben 안에서도 한도와 증빙 규칙이 다릅니다.",
    "보험사가 전자 전송한 금액과 실제 납부액이 다르게 보이면 보험사 자료와 ELSTER 불러오기 내역을 대조하세요.",
    "직업 관련 교육비인지 개인의 첫 직업교육비인지에 따라 Werbungskosten와 Sonderausgaben 판단이 달라질 수 있습니다.",
  ]),
  "german-household-services-tax-guide": practical([
    "§35a 감면은 소득에서 빼는 Werbungskosten와 달리 요건을 충족한 금액을 세액에서 직접 줄이는 구조입니다.",
    "Handwerkerleistungen는 재료비 전체가 아니라 법이 인정하는 Arbeitskosten 중심이므로 Rechnung의 항목 구분을 확인하세요.",
    "현금 대신 계좌이체 기록과 Rechnung을 함께 보관하고, Nebenkostenabrechnung에 포함된 가사서비스도 확인해 보세요.",
  ]),
  "german-capital-income-tax-guide": practical([
    "여러 은행에 Freistellungsauftrag을 나눠 설정했다면 전체 합계가 Sparer-Pauschbetrag을 넘지 않는지 관리하세요.",
    "해외 브로커는 독일 세금을 자동 처리하지 않을 수 있으므로 연간 거래·배당·이자 자료를 별도로 보관하세요.",
    "손실상계, 외국원천세, Kirchensteuer 여부는 개인 상황에 따라 달라지므로 단순 25%만으로 최종세액을 계산하지 마세요.",
  ]),
  "german-tax-assessment-guide": practical([
    "Steuerbescheid를 받으면 신고한 항목과 Finanzamt가 인정한 금액을 항목별로 비교하세요.",
    "Erläuterungen에는 자동 계산 화면에서 보이지 않는 조정 이유가 적혀 있을 수 있습니다.",
    "이의가 있다면 Rechtsbehelfsbelehrung의 Einspruch 기한과 제출방법을 먼저 확인하고 근거자료를 정리하세요.",
  ]),
  "german-elster-guide": practical([
    "ELSTER 계정 활성화에는 시간이 걸릴 수 있으므로 신고 마감 직전에 처음 만들지 않는 편이 좋습니다.",
    "Belegabruf 권한과 실제 신고서 제출은 별도 단계이므로 자료를 불러온 뒤 각 Anlage에 올바르게 반영됐는지 확인하세요.",
    "제출 후 Übermittlungsprotokoll과 신고본을 PDF로 보관하면 다음 연도 신고와 Bescheid 비교에 도움이 됩니다.",
  ]),
  "german-expat-tax-residency-guide": practical([
    "독일 Wohnsitz·gewöhnlicher Aufenthalt 여부와 한국의 세법상 거주자 여부는 서로 다른 법체계에서 각각 판단합니다.",
    "한국의 이자·배당·임대·근로소득이 있다면 소득 종류별로 한독 조세조약의 과세권과 이중과세 조정방식을 확인하세요.",
    "해외계좌나 해외소득은 자료 수집에 시간이 걸리므로 연말정산 자료를 국가별·소득별로 미리 분리해 두세요.",
  ]),
  "german-visa-residence-overview-guide": practical([
    "먼저 국적·현재 체류국·입국 목적·예상 체류기간·취업 여부를 적어두면 맞는 체류경로를 찾기 쉽습니다.",
    "입국용 nationales Visum과 독일 내 Aufenthaltstitel은 단계가 다르므로 각각의 만료일과 신청기관을 구분하세요.",
    "eAT 카드뿐 아니라 Zusatzblatt와 Nebenbestimmungen도 함께 읽어 실제 취업·학업 제한을 확인하세요.",
  ]),
  "german-visa-application-process-guide": practical([
    "재외공관 체크리스트는 신청 국가와 비자 목적별로 달라질 수 있으므로 예약 전에 최신 버전을 다시 내려받으세요.",
    "입학허가·고용계약·재정증명·보험처럼 유효기간이 있는 서류는 인터뷰 날짜와 입국 예정일을 기준으로 점검하세요.",
    "온라인 제출을 했더라도 원본·번역·인증 서류를 별도로 요구할 수 있으므로 관할 공관 안내를 최종 기준으로 보세요.",
  ]),
  "german-student-residence-permit-guide": practical([
    "입국 뒤 Anmeldung, 건강보험, Immatrikulationsbescheinigung, 재정증명 자료를 한 폴더에 모아 외국인청 신청에 대비하세요.",
    "학생 근로의 140일/280반일 규칙과 사회보험의 Werkstudent 20시간 원칙은 서로 다른 제도이므로 따로 확인하세요.",
    "학업 지연·휴학·전공변경·대학변경은 체류허가에 영향을 줄 수 있으므로 변경 전에 International Office와 외국인청에 확인하세요.",
  ]),
  "german-post-graduation-job-search-guide": practical([
    "졸업일과 학생 체류허가 만료일을 따로 확인하고, 졸업 직후 18개월 구직 체류 신청에 필요한 서류를 준비하세요.",
    "구직기간에는 단순 생계형 일자리만 찾기보다 학위와 연결되는 qualifizierte Beschäftigung으로 전환할 계획을 세우는 것이 중요합니다.",
    "취업계약을 받으면 §18b, EU Blue Card 등 가능한 체류경로의 자격·급여·직무 요건을 비교하세요.",
  ]),
  "german-opportunity-card-guide": practical([
    "Chancenkarte는 인정된 Fachkraft 경로와 포인트 경로가 다르므로 자신이 어느 경로인지 먼저 구분하세요.",
    "재정증명은 신청 시점의 2026 기준금액과 실제 부업 순소득을 함께 계산해 부족분이 없는지 확인하세요.",
    "구직 중 허용되는 부업·시험근무 범위와 카드의 Nebenbestimmungen을 확인하고 근무기록을 보관하세요.",
  ]),
  "german-skilled-worker-residence-guide": practical([
    "자격의 Anerkennung 또는 학위 비교가능성, 규제직종의 Berufsausübungserlaubnis 필요 여부를 계약 전에 확인하세요.",
    "고용계약서의 직무가 qualifizierte Beschäftigung인지와 근무시간·급여·근무지가 신청서와 일치하는지 점검하세요.",
    "45세 초과 최초 취업 입국자는 해당 연도의 급여기준 또는 노후보장 증명 요건을 별도로 확인해야 합니다.",
  ]),
  "german-eu-blue-card-guide": practical([
    "2026년에는 일반직종과 부족직종·최근 졸업자의 급여기준이 다르므로 자신의 직종과 졸업시점을 먼저 확인하세요.",
    "고용계약 기간이 최소요건을 충족하는지, 학위·경력과 직무의 관련성이 요구되는 범위에 맞는지 확인하세요.",
    "첫 1년 이직 시에는 새 고용관계를 외국인청에 통지해야 하는 규정이 있으므로 계약 변경 전에 준비하세요.",
  ]),
  "german-qualification-recognition-residence-guide": practical([
    "Anerkennungsbescheid에서 어떤 차이가 확인됐는지와 필요한 Anpassungsqualifizierung·시험을 먼저 정리하세요.",
    "§16d 체류와 자격인정 절차는 같은 절차가 아니므로 인정기관과 외국인청의 요구서류를 각각 관리하세요.",
    "보완조치가 끝난 뒤에는 인정 완료 증명과 취업계약을 바탕으로 다음 체류자격 전환 시점을 계획하세요.",
  ]),
  "german-residence-permit-renewal-guide": practical([
    "eAT 앞면 만료일, 여권 만료일, Zusatzblatt 조건을 함께 확인하고 캘린더에 충분한 여유를 두고 신청 준비를 시작하세요.",
    "학생·취업·가족 등 체류목적별로 재학·고용·보험·생계 증명이 달라지므로 과거 신청서류를 그대로 재사용하지 마세요.",
    "만료 전에 적법하게 연장 신청을 했지만 카드가 늦어지는 경우 Fiktionswirkung·Fiktionsbescheinigung 적용 여부를 관할청에 확인하세요.",
  ]),
  "german-job-change-residence-permit-guide": practical([
    "새 계약에 서명하기 전 현재 카드와 Zusatzblatt에 Arbeitgeberbindung 또는 직무 제한이 있는지 확인하세요.",
    "새 직장의 직무명·급여·근무시간·시작일을 기존 체류자격 요건과 비교하고 필요한 경우 사전 승인을 받으세요.",
    "EU Blue Card와 §18a·§18b는 이직 규칙이 같지 않으므로 자신의 법적 근거를 카드와 Bescheid에서 확인하세요.",
  ]),
  "german-job-loss-residence-permit-guide": practical([
    "고용 종료일, 현재 카드 만료일, Zusatzblatt 제한을 즉시 확인하고 관련 문서를 보관하세요.",
    "Ausländerbehörde 문의와 별개로 Agentur für Arbeit의 arbeitssuchend/arbeitslos 신고, 건강보험 상태도 각각 처리해야 합니다.",
    "새 일자리를 찾았을 때 기존 허가로 바로 시작할 수 있는지 또는 새 허가·승인이 필요한지 서면으로 확인하세요.",
  ]),
  "german-family-reunification-guide": practical([
    "합류 대상이 독일인, EU 시민, Fachkraft, Blue Card 보유자 등 누구인지에 따라 적용 규정과 서류가 달라집니다.",
    "혼인·출생증명서의 원본, 번역, 아포스티유 필요 여부를 관할 재외공관 체크리스트에서 미리 확인하세요.",
    "독일 입국 뒤 Anmeldung, 건강보험, 체류허가 신청과 배우자의 취업 가능 범위를 카드 발급 전후로 확인하세요.",
  ]),
  "german-permanent-residence-guide": practical([
    "일반 §9, Fachkraft §18c, EU Blue Card 특별경로는 요구 체류기간·연금기여·언어요건이 다르므로 먼저 적용 조항을 정하세요.",
    "Rentenversicherungsverlauf, 최근 급여명세서, 고용확인, 주거·보험 자료는 발급에 시간이 걸릴 수 있어 미리 준비하세요.",
    "체류기간 계산에는 모든 독일 체류가 동일하게 반영되는 것이 아니므로 과거 체류자격별 기간을 정리해 관할청에 확인하세요.",
  ]),
  "german-permanent-residence-skilled-workers-guide": practical([
    "§18a·§18b·§18d·§18g 등 어떤 Fachkraft 체류자격을 얼마나 보유했는지 eAT와 Bescheid 기록으로 정리하세요.",
    "독일에서 학위나 직업교육을 마쳤다면 일반 Fachkraft 경로보다 짧은 특별요건이 적용되는지 확인하세요.",
    "연금보험 기여개월은 추정하지 말고 Deutsche Rentenversicherung의 Versicherungsverlauf로 실제 인정개월을 확인하세요.",
  ]),
  "german-housing-search-guide": practical([
    "학생이라면 합격 통지를 기다리기 전에도 Studierendenwerk 기숙사 신청 가능 시점을 확인하고 대기명단을 일찍 잡으세요.",
    "Warmmiete만 보지 말고 Strom·Internet·Rundfunkbeitrag와 초기 Kaution까지 포함한 월·초기 예산을 따로 계산하세요.",
    "지나치게 싼 매물, 해외에 있다는 집주인, 열쇠 전달 전 선입금 요구처럼 전형적인 사기 신호를 확인하세요.",
  ]),
  "german-wg-wohnung-sublet-guide": practical([
    "WG에서는 Hauptmieter, Mitmieter, Untermieter 중 자신이 어떤 계약당사자인지 먼저 확인하세요.",
    "Zwischenmiete 기간, 가구 사용, Nebenkosten 정산, Kaution, Kündigung 조건을 구두가 아니라 계약서에 남기세요.",
    "Anmeldung이 필요하다면 실제 Wohnungsgeber가 Wohnungsgeberbestätigung을 발급할 수 있는지 입주 전에 확인하세요.",
  ]),
  "german-rent-costs-guide": practical([
    "Kaltmiete, Betriebskosten, Heizkosten, Strom, Internet을 항목별로 적어 실제 월 주거비를 계산하세요.",
    "Vorauszahlung은 연간 정산으로 Nachzahlung이 생길 수 있지만 Pauschale는 계약 구조가 다르므로 용어를 확인하세요.",
    "학생은 월세 외에도 Semesterbeitrag·보험·교통·식비가 동시에 발생하므로 주거비 상한을 전체 생활비에서 역산하는 편이 안전합니다.",
  ]),
  "german-rental-application-documents-guide": practical([
    "학생은 Immatrikulationsbescheinigung, 장학금·재정증명, Bürgschaft 등 소득증빙을 대체할 수 있는 자료를 미리 준비해 두세요.",
    "신분증 전체 사본·은행정보 같은 민감자료는 매물과 상대방의 진위를 확인한 뒤 필요한 범위만 제출하세요.",
    "여러 매물에 지원할 때는 파일명과 최신 날짜를 통일해 오래된 급여명세서나 잘못된 주소를 보내지 않도록 관리하세요.",
  ]),
  "german-rental-application-message-guide": practical([
    "첫 메시지에는 이름, 입주 희망일, 직업·학업 상태, 입주인원, Besichtigung 가능시간 정도를 짧게 넣으세요.",
    "학생이라면 학기·전공과 재정증명 또는 Bürgschaft 준비 여부를 한 줄로 알리면 임대인이 상황을 이해하기 쉽습니다.",
    "매물 설명의 질문에 이미 답이 있다면 반복 질문보다 실제로 필요한 확인사항만 남기는 편이 좋습니다.",
  ]),
  "german-rental-contract-guide": practical([
    "계약서에서 Kaltmiete, Nebenkosten, Kaution, 시작일, 계약기간, Kündigung 조항을 먼저 표시해 두세요.",
    "Staffelmiete·Indexmiete·Mindestmietdauer·Kündigungsausschluss가 있다면 향후 비용과 이사 가능 시점에 직접 영향을 줍니다.",
    "가구가 포함된 집은 Inventarliste와 상태를 계약 부속문서 또는 Übergabeprotokoll에 남기세요.",
  ]),
  "german-rental-deposit-guide": practical([
    "주택임대의 금전 Kaution은 원칙적으로 Betriebskosten를 제외한 월세 3배가 상한인지 확인하세요.",
    "현금 Kaution은 법이 인정하는 3회 분할납부 권리가 있으므로 입주 전 전액 송금 요구를 그대로 따를 필요가 있는지 확인하세요.",
    "송금계좌의 명의와 계약 상대방이 일치하는지 확인하고 입금증을 퇴거 후 반환이 끝날 때까지 보관하세요.",
  ]),
  "german-anmeldung-housing-guide": practical([
    "Anmeldung은 실제 입주 후 진행하며 일반적으로 입주 후 2주 내 신고 의무가 있으므로 Bürgeramt 예약을 일찍 확인하세요.",
    "Mietvertrag와 Wohnungsgeberbestätigung은 다른 문서이므로 집주인·Hauptmieter가 확인서를 발급할 수 있는지 확인하세요.",
    "호텔·단기숙소·Untermiete는 Anmeldung 가능 여부가 제각각이므로 계약 전에 주소등록 가능성을 서면으로 확인하는 편이 안전합니다.",
  ]),
  "german-move-in-handover-guide": practical([
    "입주 당일 각 방 전체사진과 기존 하자를 가까이·멀리서 모두 촬영하고 날짜가 남는 원본을 보관하세요.",
    "전기·가스·수도 계량기 번호와 수치를 사진으로 남겨 이전 거주자의 사용량이 청구되지 않도록 하세요.",
    "열쇠 개수, Keller·우편함·주차장 등 부속공간 인수 여부도 Übergabeprotokoll에 적으세요.",
  ]),
  "german-nebenkosten-statement-guide": practical([
    "Abrechnungszeitraum, 총비용, Verteilerschlüssel, 본인 선납액, 최종 Nachzahlung/Guthaben을 순서대로 대조하세요.",
    "난방·온수는 일반 Betriebskosten와 별도 규칙이 적용될 수 있으므로 소비량과 계량기 자료도 확인하세요.",
    "금액이 이상하면 바로 납부 거부부터 하기보다 Belegeinsicht를 요청해 원자료와 배분기준을 확인하세요.",
  ]),
  "german-rental-defects-mold-guide": practical([
    "하자를 발견한 날짜, 위치, 범위, 사진을 기록하고 집주인 또는 Hausverwaltung에 지체 없이 서면 통보하세요.",
    "곰팡이는 환기 습관만으로 원인을 단정하지 말고 건축·단열·누수 가능성까지 포함해 원인 확인을 요청하세요.",
    "Mietminderung 비율을 인터넷 표만 보고 임의 적용하면 체납 분쟁이 생길 수 있으므로 구체적 사안은 전문상담을 받으세요.",
  ]),
  "german-rental-termination-guide": practical([
    "계약서의 Mindestmietdauer·Kündigungsausschluss·befristet 여부를 확인한 뒤 실제 종료 가능일을 계산하세요.",
    "해지서는 발송일보다 상대방에게 도달한 시점이 중요할 수 있으므로 증명 가능한 전달방법을 선택하세요.",
    "이사일과 계약종료일이 다르면 겹치는 월세·전기·인터넷 비용까지 예산에 반영하세요.",
  ]),
  "german-nachmieter-early-moveout-guide": practical([
    "Nachmieter를 구하면 자동 해지된다는 전제 대신 계약서의 관련 조항과 집주인의 서면 동의 여부를 먼저 확인하세요.",
    "조기 종료에 합의한다면 Aufhebungsvereinbarung에 종료일, 열쇠반환일, 남은 월세와 Kaution 처리방식을 적으세요.",
    "후임 후보자의 개인정보를 집주인에게 전달할 때는 필요한 범위와 당사자 동의를 고려하세요.",
  ]),
  "german-rental-deposit-return-guide": practical([
    "퇴거일에 Übergabeprotokoll, 최종 계량기 수치, 반환 열쇠 수를 기록하고 양측이 확인할 수 있게 남기세요.",
    "집주인이 Kaution 일부를 보류한다면 어떤 청구나 Nebenkosten 정산 때문에 얼마를 보류하는지 서면으로 문의하세요.",
    "입주·퇴거 사진, 수리 영수증, 통신문, 계좌이체 내역을 보증금 반환이 끝날 때까지 보관하세요.",
  ]),
  "german-private-liability-insurance-guide": practical([
    "Privathaftpflicht는 법정 의무보험은 아니지만 큰 배상책임 위험을 적은 보험료로 대비하는 대표적인 생활보험입니다.",
    "열쇠 분실, 임대주택 손상, 가족·파트너 포함 여부와 Selbstbeteiligung을 약관에서 확인하세요.",
    "학생은 부모 보험의 가족보장에 계속 포함되는지 먼저 확인한 뒤 중복가입을 피하세요.",
  ]),
  "german-car-insurance-guide": practical([
    "Kfz-Haftpflicht는 차량 등록에 필수이며 eVB 번호가 Zulassung 절차에 사용됩니다.",
    "Teilkasko·Vollkasko는 차량가액, 자기부담금, 운전자 범위와 Schadenfreiheitsklasse를 함께 비교하세요.",
    "한국의 무사고 경력 인정 가능 여부는 보험사마다 다를 수 있으므로 증명서 형식과 번역 요구를 가입 전에 확인하세요.",
  ]),
  "german-legal-expenses-insurance-guide": practical([
    "Rechtsschutz는 계약 직후 이미 발생한 분쟁까지 소급 보장하는 보험이 아니며 대기기간이 있는 영역이 많습니다.",
    "Privat, Beruf, Verkehr, Wohnen 등 필요한 모듈과 Selbstbeteiligung, 보장한도를 비교하세요.",
    "노동·임대 분쟁은 Gewerkschaft, Mieterverein 등 다른 지원수단이 있는지도 함께 확인하면 중복비용을 줄일 수 있습니다.",
  ]),
  "german-household-contents-insurance-guide": practical([
    "Hausrat는 집 자체가 아니라 가구·전자제품·의류 등 가재도구의 특정 위험을 보장하는 보험입니다.",
    "자전거 도난, Elementarschäden, 외부보관 물품은 기본보장에 포함되지 않을 수 있어 약관을 확인하세요.",
    "이사할 때는 새 주소와 주거면적을 보험사에 알리고 기존·신규 주택의 보장 전환기간을 확인하세요.",
  ]),
  "german-travel-insurance-guide": practical([
    "독일 GKV의 해외보장은 국가와 치료상황에 따라 제한되므로 여행지별 보장범위를 출국 전에 확인하세요.",
    "Auslandskrankenversicherung과 Reiserücktrittversicherung은 보장 목적이 다르므로 필요한 위험을 구분해 가입하세요.",
    "장기체류·유학·위험스포츠는 일반 단기 여행보험의 기간·면책 범위를 벗어날 수 있습니다.",
  ]),
  "german-probation-period-guide": practical([
    "Probezeit와 KSchG의 6개월 Wartezeit는 관련은 있지만 같은 제도가 아니므로 계약과 법적 보호요건을 따로 보세요.",
    "수습기간 중에도 병가, 임금, 휴가발생 등 기본 노동법상 권리가 사라지는 것은 아닙니다.",
    "해지통보를 받으면 통보일·종료일·서면원본 여부를 확인하고 실업신고 기한도 즉시 계산하세요.",
  ]),
  "german-job-platforms-applications-guide": practical([
    "공고별 필수요건과 우대요건을 나눠 CV·Anschreiben에서 실제 경험과 연결해 보여주세요.",
    "LinkedIn·XING·Bundesagentur für Arbeit뿐 아니라 회사 채용페이지와 대학 Career Service도 함께 확인하세요.",
    "지원일, 공고 URL, 담당자, 후속 연락일을 표로 관리하면 중복지원과 마감 누락을 줄일 수 있습니다.",
  ]),
};