import type { Metadata } from "next";
import LegalPage, { LegalSection, OperatorFields } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Impressum · 운영자 정보 | German Hanguk", robots: { index: false } };

export default function Page() {
  return <LegalPage title="Impressum" koreanTitle="운영자 정보">
    <section>
      <h2 lang="de">Angaben zum Diensteanbieter</h2><h3 lang="ko">서비스 운영자 정보</h3>
      <p lang="de">Die nach § 5 DDG und gegebenenfalls weiteren Vorschriften erforderlichen Angaben müssen mit den tatsächlichen Betreiberangaben vervollständigt werden. Solange die folgenden Felder offen sind, ist dieses Impressum nicht als vollständig zu behandeln.</p>
      <p lang="ko">DDG § 5 및 해당되는 추가 규정에 필요한 실제 운영자 정보를 입력해야 합니다. 아래 항목이 미설정인 동안에는 완성된 임프레숨으로 보아서는 안 됩니다.</p>
      <OperatorFields fields={["operatorName","legalFormAndRepresentative","serviceAddress","contactEmail","additionalContactMethod","registerAndNumber","vatOrBusinessIdentification","licensingAuthority","regulatedProfessionDetails","capitalAndLiquidationDetails","editorialResponsiblePerson"]} />
    </section>
    <LegalSection title="Urheberrecht" koreanTitle="저작권" de="Eigene redaktionelle Inhalte und Gestaltung von German Hanguk sind urheberrechtlich geschützt, soweit Schutz besteht. Rechte an Nutzerbeiträgen und gekennzeichneten Inhalten Dritter verbleiben bei den jeweiligen Rechteinhabern. Hinweise auf mögliche Rechtsverletzungen können über das Kontaktformular gemeldet werden." ko="German Hanguk이 직접 제작한 편집 콘텐츠와 디자인은 보호 대상인 범위에서 저작권의 보호를 받습니다. 이용자 게시물 및 표시된 제3자 콘텐츠의 권리는 각 권리자에게 있습니다. 권리 침해가 의심되는 경우 문의 양식으로 신고할 수 있습니다." />
    <p><a href="https://www.gesetze-im-internet.de/ddg/__5.html">§ 5 DDG</a></p>
  </LegalPage>;
}
