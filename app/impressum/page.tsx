import type { Metadata } from "next";
import LegalPage, { LegalSection, OperatorFields } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Impressum · 운영자 정보 | German Hanguk", robots: { index: false } };

export default function Page() {
  return <LegalPage title="Impressum" koreanTitle="운영자 정보">
    <section>
      <h2 lang="de">Angaben zum Diensteanbieter</h2><h3 lang="ko">서비스 운영자 정보</h3>
      <p lang="de">Kontakt ist derzeit per E-Mail möglich. Die mit „Noch nicht hinterlegt“ markierten Angaben dürfen nicht durch Platzhalter ersetzt werden: Der Betreiber muss sie vorlegen, soweit sie für den konkreten Betrieb erforderlich sind.</p>
      <p lang="ko">현재 이메일로 연락할 수 있습니다. “미설정”으로 표시된 항목은 임의의 정보로 대체하지 않습니다. 해당 운영 형태에 필요한 실제 정보는 운영자가 확인하여 게시해야 합니다.</p>
      <OperatorFields fields={["operatorName","legalFormAndRepresentative","serviceAddress","contactEmail","additionalContactMethod","registerAndNumber","vatOrBusinessIdentification","licensingAuthority","regulatedProfessionDetails","capitalAndLiquidationDetails","editorialResponsiblePerson"]} />
    </section>
    <LegalSection title="Hinweis zu Pflichtangaben" koreanTitle="필수 고지 관련 안내" de="§ 5 DDG verlangt bei geschäftsmäßigen, in der Regel gegen Entgelt angebotenen digitalen Diensten unter anderem leicht erkennbare und unmittelbar erreichbare Anbieterangaben. Ob und welche weiteren Angaben im Einzelfall erforderlich sind, hängt von der tatsächlichen Betreiberform und Tätigkeit ab." ko="독일 DDG 제5조는 사업적으로, 통상 유상 제공되는 디지털 서비스에 대해 쉽게 확인하고 즉시 접근할 수 있는 운영자 정보를 요구합니다. 추가 고지의 적용 여부는 실제 운영 형태와 활동에 따라 달라집니다." />
    <LegalSection title="Urheberrecht und Meldungen" koreanTitle="저작권 및 신고" de="Eigene Inhalte und Gestaltung sind im gesetzlich geschützten Umfang geschützt. Rechte an Nutzerbeiträgen und gekennzeichneten Inhalten Dritter verbleiben bei den jeweiligen Rechteinhabern. Hinweise auf mögliche Rechtsverletzungen bitte mit URL und Begründung an die Kontaktadresse senden." ko="직접 제작한 콘텐츠와 디자인은 법이 보호하는 범위에서 보호됩니다. 이용자 게시물과 표시된 제3자 콘텐츠의 권리는 각 권리자에게 있습니다. 권리 침해가 의심되면 URL과 사유를 포함해 문의처로 알려 주세요." />
    <p><a href="https://www.gesetze-im-internet.de/ddg/__5.html">§ 5 DDG</a></p>
  </LegalPage>;
}
