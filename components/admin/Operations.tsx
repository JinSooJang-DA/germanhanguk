"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/constants";
import styles from "./admin.module.css";

type Member = { id: string; display_name: string | null; created_at: string; role: string; tandem_enabled: boolean; profile_complete: boolean; posts: number; comments: number };
type Contact = { id: string; category: string; status: string; created_at: string };
type Detail = Contact & { subject: string; name: string | null; email: string; message: string };
type Dashboard = { tracked_since: string; active_members: number; tandem_enabled: number; lifecycle: { days: number; signups: number; withdrawals: number }[]; activity: { days: number; posts: number; comments: number }[]; articles: { pending: number; published: number; rejected: number }; contacts: { new: number; open: number }; recent_signups: Pick<Member,"id" | "display_name" | "created_at">[] };
type Community = { categories: { category: string; posts: number; comments: number; withdrawn_posts: number }[]; recent_posts: { id: number; title: string; category: string; created_at: string; withdrawn: boolean }[]; withdrawn_posts: { id: number; title: string; created_at: string; cleanup_eligible: boolean }[] };
type Data = Dashboard | Community | { total: number; rows: Member[] | Contact[] };
const statusLabels: Record<string,string> = { new: "신규 / Neu", in_progress: "처리 중 / In Bearbeitung", closed: "완료 / Geschlossen" };
const period = (days: number) => days === 1 ? "오늘 / Heute" : `${days}일 / ${days} Tage`;
const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const category = (value: string) => { const item = CATEGORIES.find(c => c.value === value); return item ? `${item.label.ko} / ${item.label.de}` : value; };
function Table({ headings, children }: { headings: string[]; children: React.ReactNode }) { return <div className={styles.scroll}><table className={styles.table}><thead><tr>{headings.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Empty() { return <p className={styles.muted}>항목이 없습니다. / Keine Einträge.</p>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className={styles.card}><span className={styles.muted}>{label}</span><strong>{value.toLocaleString("ko-KR")}</strong></div>; }
export default function Operations({ section }: { section: "dashboard" | "members" | "community" | "contact" }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const detailGeneration = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError(""); setData(null);
    const rpc = section === "dashboard" ? "admin_dashboard" : section === "members" ? "admin_members" : section === "community" ? "admin_community" : "admin_contacts";
    const params = section === "members" ? { p_search: search, p_page: page } : section === "contact" ? { p_page: page, p_status: status } : {};
    const { data: result, error: failure } = await supabase.rpc(rpc, params);
    if (current !== generation.current) return;
    if (failure) setError("불러오지 못했습니다. 권한과 연결을 확인하고 다시 시도하세요. / Laden fehlgeschlagen. Bitte Zugriff und Verbindung prüfen.");
    else setData(result as Data);
    setLoading(false);
  }, [section, search, page, status]);
  useEffect(() => { const generationRef = generation; const detailRef = detailGeneration; const timer = setTimeout(() => { void load(); },0); return () => { clearTimeout(timer); generationRef.current++; detailRef.current++; }; }, [load]);
  async function openDetail(id: string) {
    const current = ++detailGeneration.current;
    setBusy(true); setDetail(null); setError("");
    const { data: result, error: failure } = await supabase.rpc("admin_contact_detail", { p_id: id });
    if (current !== detailGeneration.current) return;
    if (failure) setError("문의 상세를 불러오지 못했습니다. / Kontaktdetails konnten nicht geladen werden.");
    else setDetail(result as Detail);
    setBusy(false);
  }
  async function updateStatus(next: string) {
    if (!detail) return;
    setBusy(true); setError("");
    const { error: failure } = await supabase.rpc("admin_contact_status", { p_id: detail.id, p_status: next });
    if (failure) setError("상태 변경에 실패했습니다. / Statusänderung fehlgeschlagen.");
    else { setDetail({ ...detail, status: next }); await load(); }
    setBusy(false);
  }
  const dashboard = section === "dashboard" ? data as Dashboard | null : null;
  const community = section === "community" ? data as Community | null : null;
  const listing = section === "members" || section === "contact" ? data as { total: number; rows: Member[] | Contact[] } | null : null;
  return <main>
    <div className={styles.toolbar}><h2>{({ dashboard: "운영 현황 / Übersicht", members: "회원 운영 / Mitglieder", community: "커뮤니티 운영 / Community", contact: "문의 관리 / Kontakt" })[section]}</h2><button onClick={() => { setDetail(null); detailGeneration.current++; setBusy(false); void load(); }} disabled={loading}>새로고침 / Aktualisieren</button></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {loading && <p role="status" aria-live="polite">불러오는 중… / Wird geladen…</p>}
    {section === "members" && <form className={styles.toolbar} onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}><label htmlFor="member-search">닉네임 검색 / Name</label><input id="member-search" value={searchInput} maxLength={100} onChange={e => setSearchInput(e.target.value)} /><button type="submit">검색 / Suchen</button></form>}
    {dashboard && <>
      <p className={styles.muted}>현재 회원 수는 실시간 프로필 기준입니다. 가입·탈퇴·순증 추이는 {date(dashboard.tracked_since)}부터 기록됩니다. 이전 이력은 포함되지 않습니다.<br />Aktuelle Mitglieder aus Live-Profilen. Lebenszyklusdaten erst seit diesem Zeitpunkt, ohne historische Rückfüllung. 오늘은 베를린 자정부터, 7/30일은 현재 시각 기준 이동 구간입니다. / Heute ab Berliner Mitternacht, 7/30 Tage rollierend.</p>
      <div className={styles.grid}><Metric label="현재 회원 / Aktive Mitglieder" value={dashboard.active_members} /><Metric label="Tandem 활성 / Aktiviert" value={dashboard.tandem_enabled} /><Metric label="신규 문의 / Neue Kontakte" value={dashboard.contacts.new} /><Metric label="문의 미완료 / Offene Kontakte" value={dashboard.contacts.open} /></div>
      <section className={styles.panel}><h2>회원 생애주기 / Mitgliederentwicklung</h2><Table headings={["기간 / Zeitraum", "가입 / Anmeldungen", "탈퇴 / Austritte", "순증 / Netto"]}>{dashboard.lifecycle.map(row => <tr key={row.days}><td>{period(row.days)}</td><td>{row.signups}</td><td>{row.withdrawals}</td><td>{row.signups-row.withdrawals}</td></tr>)}</Table></section>
      <section className={styles.panel}><h2>커뮤니티 활동 / Aktivität</h2><Table headings={["기간 / Zeitraum", "게시글 / Beiträge", "댓글 / Kommentare"]}>{dashboard.activity.map(row => <tr key={row.days}><td>{period(row.days)}</td><td>{row.posts}</td><td>{row.comments}</td></tr>)}</Table><p className={styles.muted}>현재 남아 있는 게시글·댓글 기준 / Aktuell vorhandene Beiträge und Kommentare.</p></section>
      <section className={styles.panel}><h2>기사 / Artikel</h2><div className={styles.grid}><Metric label="검토 대기 / Ausstehend" value={dashboard.articles.pending} /><Metric label="공개 / Veröffentlicht" value={dashboard.articles.published} /><Metric label="반려 / Abgelehnt" value={dashboard.articles.rejected} /></div><Link href="/admin/articles">기사 검토·자동화 상태 / Prüfung und Automatisierung →</Link></section>
      <section className={styles.panel}><h2>최근 가입 회원 / Neueste Mitglieder</h2>{dashboard.recent_signups.length ? <Table headings={["닉네임 / Name", "가입 / Beitritt"]}>{dashboard.recent_signups.map(row => <tr key={row.id}><td><Link href={`/profile/${row.id}`}>{row.display_name || "미설정 / Offen"}</Link></td><td><time dateTime={row.created_at}>{date(row.created_at)}</time></td></tr>)}</Table> : <Empty />}</section>
    </>}
    {section === "members" && listing && <section className={styles.panel}><p className={styles.muted}>총 {listing.total}명 / Mitglieder · 이메일과 비공개 개인정보는 표시하지 않습니다. / Keine E-Mail oder privaten Profildaten.</p>{listing.rows.length ? <Table headings={["닉네임 / Name", "가입 / Beitritt", "프로필 / Profil", "권한 / Rolle", "글 / Beiträge", "댓글 / Kommentare", "Tandem"]}>{(listing.rows as Member[]).map(row => <tr key={row.id}><td><Link href={`/profile/${row.id}`}>{row.display_name || "미설정 / Offen"}</Link></td><td>{date(row.created_at)}</td><td>{row.profile_complete ? "완료 / Vollständig" : "미설정 / Offen"}</td><td>{row.role === "admin" ? "관리자 / Admin" : "회원 / Mitglied"}</td><td>{row.posts}</td><td>{row.comments}</td><td>{row.tandem_enabled ? "활성 / Ja" : "비활성 / Nein"}</td></tr>)}</Table> : <Empty />}</section>}
    {community && <>
      <section className={styles.panel}><h2>카테고리 현황 / Kategorien</h2>{community.categories.length ? <Table headings={["카테고리 / Kategorie", "글 / Beiträge", "댓글 / Kommentare", "탈퇴 회원 글 / Ehemalige"]}>{community.categories.map(row => <tr key={row.category}><td>{category(row.category)}</td><td>{row.posts}</td><td>{row.comments}</td><td>{row.withdrawn_posts}</td></tr>)}</Table> : <Empty />}</section>
      <section className={styles.panel}><h2>최근 게시글 / Neueste Beiträge</h2>{community.recent_posts.length ? <Table headings={["제목 / Titel", "카테고리 / Kategorie", "작성일 / Datum"]}>{community.recent_posts.map(row => <tr key={row.id}><td><Link href={`/posts/${row.id}`}>{row.title}</Link>{row.withdrawn && " · 탈퇴 / Ehemalig"}</td><td>{category(row.category)}</td><td>{date(row.created_at)}</td></tr>)}</Table> : <Empty />}</section>
      <section className={styles.panel}><h2>탈퇴 회원 게시글 정리 / Bereinigung</h2><p className={styles.muted}>최근 50개까지 표시합니다. 기존 게시글 상세에서 정리할 수 있습니다. 다른 회원의 댓글이 있으면 정리할 수 없습니다.<br />Bis zu 50 neueste Beiträge. Bestehende Bereinigung auf der Beitragsseite; aktive Kommentare bleiben geschützt.</p>{community.withdrawn_posts.length ? <Table headings={["제목 / Titel", "정리 가능 / Bereinigung"]}>{community.withdrawn_posts.map(row => <tr key={row.id}><td><Link href={`/posts/${row.id}`}>{row.title}</Link></td><td>{row.cleanup_eligible ? "상세에서 확인 / Im Beitrag prüfen" : "다른 회원 댓글 있음 / Aktive Kommentare"}</td></tr>)}</Table> : <Empty />}</section>
    </>}
    {section === "contact" && <>
      <div className={styles.toolbar}><label htmlFor="contact-status">상태 / Status</label><select id="contact-status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); setDetail(null); detailGeneration.current++; setBusy(false); }}><option value="">전체 / Alle</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <p className={styles.muted}>보관 기간 내 문의만 표시합니다. 이메일·메시지는 상세 열기 후 표시됩니다. / Nur Kontakte innerhalb der Aufbewahrungsfrist. E-Mail und Nachricht erst nach Öffnen der Details.</p>
      {listing && <section className={styles.panel}>{listing.rows.length ? <Table headings={["작성일 / Datum", "유형 / Kategorie", "상태 / Status", "상세 / Details"]}>{(listing.rows as Contact[]).map(row => <tr key={row.id}><td>{date(row.created_at)}</td><td>{({general:"일반 / Allgemein",content:"콘텐츠 / Inhalt",privacy:"개인정보 / Datenschutz",technical:"기술 / Technik"} as Record<string,string>)[row.category] || row.category}</td><td>{statusLabels[row.status]}</td><td><button disabled={busy} onClick={() => void openDetail(row.id)}>상세 열기 / Öffnen</button></td></tr>)}</Table> : <Empty />}</section>}
      {detail && <section className={styles.panel} aria-label="문의 관리 / Kontaktdetails"><div className={styles.toolbar}><h2>{detail.subject}</h2><button onClick={() => { setDetail(null); detailGeneration.current++; setBusy(false); }}>닫기 / Schließen</button></div><p>{detail.name || "이름 미입력 / Ohne Namen"} · {detail.email}</p><p className={styles.detail}>{detail.message}</p><div className={styles.toolbar}><label htmlFor="detail-status">처리 상태 / Bearbeitungsstatus</label><select id="detail-status" disabled={busy} value={detail.status} onChange={e => void updateStatus(e.target.value)}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div></section>}
    </>}
    {listing && <nav className={styles.toolbar} aria-label="목록 페이지 / Seitennavigation"><button disabled={loading || page===1} onClick={() => { setDetail(null); setPage(page-1); }}>이전 / Zurück</button><span aria-live="polite">{page} / {Math.max(1,Math.ceil(listing.total/25))} · {listing.total}건</span><button disabled={loading || page*25>=listing.total} onClick={() => { setDetail(null); setPage(page+1); }}>다음 / Weiter</button></nav>}
  </main>;
}
