"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DraftArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  category: string;
  source_urls: Array<{ title?: string; url?: string; kind?: "article" | "image"; photographer?: string; photographerUrl?: string }>;
  image_url: string | null;
  is_featured: boolean;
  status: "draft" | "published";
  review_status: "pending" | "approved" | "rejected";
  ai_generated: boolean;
  created_at: string;
};

type Editor = Pick<DraftArticle, "id" | "title" | "summary" | "content" | "category" | "image_url" | "is_featured">;
type ArticleTab = "pending" | "published" | "rejected";
type AutomationStatus = {
  worker: { state: "never_run" | "running" | "success" | "failed" | "skipped"; startedAt: string | null; finishedAt: string | null; exitCode: number | null };
  schedule: string[];
  timezone: string;
  maxArticlesPerRun: number;
};

export default function AdminArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<DraftArticle[]>([]);
  const [tab, setTab] = useState<ArticleTab>("pending");
  const [selected, setSelected] = useState<DraftArticle | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [automation, setAutomation] = useState<AutomationStatus | null>(null);
  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      router.push("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      setMessage("관리자만 접근할 수 있습니다.");
      setLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (accessToken) {
      try {
        const response = await fetch("/api/admin/automation-status", {
          headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store",
        });
        if (response.ok) setAutomation(await response.json() as AutomationStatus);
      } catch {
        setAutomation(null);
      }
    }

    const { data, error } = await supabase
      .from("articles")
      .select("id,slug,title,summary,content,category,source_urls,image_url,is_featured,status,review_status,ai_generated,created_at")
      .order("created_at", { ascending: false });
    if (error) setMessage("초안을 불러오지 못했습니다: " + error.message);
    else setArticles((data || []) as DraftArticle[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { void loadDrafts(); }, [loadDrafts]);
  function choose(article: DraftArticle) {
    setSelected(article);
    setEditor({ id: article.id, title: article.title, summary: article.summary, content: article.content, category: article.category, image_url: article.image_url, is_featured: article.is_featured });
    setMessage("");
  }

  async function saveDraft() {
    if (!editor) return;
    setSaving(true);
    const { error } = await supabase.from("articles").update({
      title: editor.title.trim(),
      summary: editor.summary?.trim() || null,
      content: editor.content.trim(),
      category: editor.category.trim(),
      image_url: editor.image_url?.trim() || null,
      is_featured: editor.is_featured,
    }).eq("id", editor.id);
    setSaving(false);
    if (error) return setMessage("저장 실패: " + error.message);
    setMessage("수정 내용을 저장했습니다.");
    await loadDrafts();
  }

  async function publishDraft() {
    if (!editor || !confirm("이 기사를 승인하고 공개할까요?")) return;
    setSaving(true);
    const { error } = await supabase.from("articles").update({
      title: editor.title.trim(), summary: editor.summary?.trim() || null,
      content: editor.content.trim(), category: editor.category.trim(),
      image_url: editor.image_url?.trim() || null, is_featured: editor.is_featured,
      review_status: "approved", status: "published", published_at: new Date().toISOString(),
      source_checked_at: new Date().toISOString(),
    }).eq("id", editor.id);
    setSaving(false);
    if (error) return setMessage("공개 실패: " + error.message);
    setSelected(null); setEditor(null); setMessage("기사를 공개했습니다.");
    await loadDrafts();
  }
  async function rejectDraft() {
    if (!selected || !confirm("이 초안을 반려할까요?")) return;
    setSaving(true);
    const { error } = await supabase.from("articles")
      .update({ review_status: "rejected" }).eq("id", selected.id);
    setSaving(false);
    if (error) return setMessage("반려 실패: " + error.message);
    setSelected(null); setEditor(null); setMessage("초안을 반려했습니다.");
    await loadDrafts();
  }

  async function restoreDraft() {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from("articles")
      .update({ review_status: "pending", status: "draft" }).eq("id", selected.id);
    setSaving(false);
    if (error) return setMessage("복구 실패: " + error.message);
    setSelected(null); setEditor(null); setTab("pending");
    setMessage("초안을 검토 대기로 되돌렸습니다.");
    await loadDrafts();
  }

  async function unpublishArticle() {
    if (!selected || !confirm("이 기사의 공개를 취소하고 검토 대기로 되돌릴까요?\n메인 LIVE와 기사 목록에서도 즉시 숨겨집니다.")) return;
    setSaving(true);
    const { error } = await supabase.from("articles")
      .update({ status: "draft", review_status: "pending", is_featured: false, published_at: null })
      .eq("id", selected.id);
    setSaving(false);
    if (error) return setMessage("공개 취소 실패: " + error.message);
    setSelected(null); setEditor(null); setTab("pending");
    setMessage("기사 공개를 취소하고 검토 대기로 되돌렸습니다.");
    await loadDrafts();
  }

  async function deleteArticle() {
    if (!selected || !confirm(`\"${selected.title}\"\n\n이 기사를 완전히 삭제할까요? 공개된 기사라면 메인 LIVE와 기사 목록에서도 사라집니다.`)) return;
    setSaving(true);
    const { error } = await supabase.from("articles").delete().eq("id", selected.id);
    setSaving(false);
    if (error) return setMessage("기사 삭제 실패: " + error.message);
    setSelected(null); setEditor(null);
    setMessage("기사를 삭제했습니다.");
    await loadDrafts();
  }

  const pendingArticles = articles.filter((article) => article.status === "draft" && article.review_status === "pending");
  const publishedArticles = articles.filter((article) => article.status === "published");
  const rejectedArticles = articles.filter((article) => article.status === "draft" && article.review_status === "rejected");
  const visibleArticles = tab === "pending" ? pendingArticles : tab === "published" ? publishedArticles : rejectedArticles;
  const todayKey = new Date().toDateString();
  const todayGenerated = articles.filter((article) => new Date(article.created_at).toDateString() === todayKey).length;
  const latestArticle = articles[0] ?? null;
  const workerStateLabel = automation?.worker.state === "success" ? "정상"
    : automation?.worker.state === "failed" ? "실패"
    : automation?.worker.state === "running" ? "실행 중"
    : automation?.worker.state === "skipped" ? "중복 실행 건너뜀" : "실행 전";
  const lastRunAt = automation?.worker.finishedAt || automation?.worker.startedAt;

  if (loading) return <main style={{ padding: 40 }}>기사 검토함을 불러오는 중...</main>;

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 20px 80px" }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: "var(--gh-text-muted)", fontSize: 13 }}>ADMIN · EDITORIAL</p>
        <h1 style={{ margin: "6px 0" }}>기사 검토함</h1>
        <p style={{ margin: 0, color: "var(--gh-text-muted)" }}>자동 생성 초안과 기존 기사를 확인하고 수정·공개·삭제할 수 있습니다.</p>
      </header>

      {message && <p style={{ padding: 12, border: "1px solid var(--gh-border)", borderRadius: 8 }}>{message}</p>}

      <section style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", marginBottom: 10, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--gh-text-muted)", fontWeight: 700 }}>AUTOMATION STATUS</p>
            <h2 style={{ margin: "4px 0 0", fontSize: 20 }}>자동기사 운영 현황</h2>
          </div>
          <span style={{ fontSize: 13, color: "var(--gh-text-muted)" }}>자동 실행 {automation?.schedule.join(" · ") || "08:00 · 19:00"} · 실행당 최대 1건</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <StatusCard label="작업기 상태" value={workerStateLabel} detail={lastRunAt ? `마지막 실행 ${new Date(lastRunAt).toLocaleString()}` : "아직 예약 실행 전입니다."} />
          <StatusCard label="오늘 생성" value={`${todayGenerated}건`} detail={`현재 검토 대기 ${pendingArticles.length}건`} />
          <StatusCard label="공개 / 반려" value={`${publishedArticles.length} / ${rejectedArticles.length}`} detail="전체 기사 기준" />
          <StatusCard label="최근 생성 기사" value={latestArticle ? latestArticle.category : "없음"} detail={latestArticle?.title || "아직 생성된 기사가 없습니다."} />
        </div>
      </section>

      <nav style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          ["pending", `검토 대기 ${pendingArticles.length}`],
          ["published", `공개된 기사 ${publishedArticles.length}`],
          ["rejected", `반려된 기사 ${rejectedArticles.length}`],
        ] as Array<[ArticleTab, string]>).map(([value, label]) => (
          <button key={value} onClick={() => { setTab(value); setSelected(null); setEditor(null); setMessage(""); }} style={{
            ...tabStyle, background: tab === value ? "#334155" : "var(--gh-surface)",
            color: tab === value ? "white" : "var(--gh-text)",
          }}>{label}</button>
        ))}
      </nav>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) 1fr", gap: 24, alignItems: "start" }}>
        <section style={{ border: "1px solid var(--gh-border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 14, fontWeight: 700, borderBottom: "1px solid var(--gh-border)" }}>
            {tab === "pending" ? "검토 대기" : tab === "published" ? "공개된 기사" : "반려된 기사"} {visibleArticles.length}건
          </div>
          {visibleArticles.length === 0 && <p style={{ padding: 18, color: "var(--gh-text-muted)" }}>이 목록에는 기사가 없습니다.</p>}
          {visibleArticles.map((article) => (
            <button key={article.id} onClick={() => choose(article)} style={{
              width: "100%", textAlign: "left", padding: 16, border: 0,
              borderBottom: "1px solid var(--gh-border)", cursor: "pointer",
              background: selected?.id === article.id ? "var(--gh-surface-muted)" : "transparent",
              color: "var(--gh-text)",
            }}>
              <span style={{ fontSize: 12, color: "var(--gh-text-muted)" }}>{article.category} · {article.review_status}</span>
              <strong style={{ display: "block", marginTop: 6, lineHeight: 1.4 }}>{article.title}</strong>
            </button>
          ))}
        </section>

        <section style={{ border: "1px solid var(--gh-border)", borderRadius: 12, padding: 22, minHeight: 360 }}>
          {!editor || !selected ? (
            <p style={{ color: "var(--gh-text-muted)" }}>왼쪽 목록에서 기사를 선택하세요.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selected.source_urls?.filter((source) => source.kind !== "image").map((source, index) => source.url ? (
                  <a key={source.url + index} href={source.url} target="_blank" rel="noreferrer"
                    style={{ color: "#3b82f6", fontWeight: 700 }}>원문 출처 열기 ↗</a>
                ) : null)}
              </div>
              <div style={{ border: "1px solid var(--gh-border)", borderRadius: 10, overflow: "hidden", background: "var(--gh-surface-muted)" }}>
                {editor.image_url ? (
                  <img src={editor.image_url} alt="기사 대표 이미지 미리보기" style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ minHeight: 180, display: "grid", placeItems: "center", color: "var(--gh-text-muted)" }}>대표 이미지가 없습니다.</div>
                )}
                <div style={{ padding: 12 }}>
                  {selected.source_urls?.find((source) => source.kind === "image") ? (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--gh-text-muted)" }}>
                      {selected.source_urls.find((source) => source.kind === "image")?.title}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--gh-text-muted)" }}>스톡 이미지 없음 · 원문 사진은 사용하지 않습니다.</p>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12, fontWeight: 700 }}>
                    <input type="checkbox" checked={editor.is_featured} onChange={(e) => setEditor({ ...editor, is_featured: e.target.checked })} />
                    메인 ‘독일 주요 소식’ 슬라이더에 표시
                  </label>
                  <p style={{ margin: "7px 0 0", color: "var(--gh-text-muted)", fontSize: 12 }}>공개 상태이면서 이 항목을 선택한 기사만 메인 슬라이더에 표시됩니다.</p>
                </div>
              </div>
              <label>제목<input value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                style={inputStyle} /></label>              <label>카테고리<input value={editor.category} onChange={(e) => setEditor({ ...editor, category: e.target.value })}
                style={inputStyle} /></label>
              <label>요약<textarea value={editor.summary || ""} onChange={(e) => setEditor({ ...editor, summary: e.target.value })}
                rows={4} style={inputStyle} /></label>
              <label>본문<textarea value={editor.content} onChange={(e) => setEditor({ ...editor, content: e.target.value })}
                rows={18} style={{ ...inputStyle, lineHeight: 1.7, resize: "vertical" }} /></label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button disabled={saving} onClick={saveDraft} style={buttonStyle}>수정 저장</button>
                {tab === "pending" && (
                  <>
                    <button disabled={saving} onClick={publishDraft} style={{ ...buttonStyle, background: "#166534" }}>승인 후 공개</button>
                    <button disabled={saving} onClick={rejectDraft} style={{ ...buttonStyle, background: "#991b1b" }}>반려</button>
                  </>
                )}
                {tab === "rejected" && (
                  <button disabled={saving} onClick={restoreDraft} style={{ ...buttonStyle, background: "#166534" }}>검토 대기로 복구</button>
                )}
                {tab === "published" && (
                  <>
                    <a href={`/articles/${selected.slug}`} target="_blank" rel="noreferrer" style={{ ...buttonStyle, textDecoration: "none" }}>공개 페이지 보기 ↗</a>
                    <button disabled={saving} onClick={unpublishArticle} style={{ ...buttonStyle, background: "#92400e" }}>공개 취소</button>
                  </>
                )}
                <button disabled={saving} onClick={deleteArticle} style={{ ...buttonStyle, background: "#991b1b" }}>기사 삭제</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ border: "1px solid var(--gh-border)", borderRadius: 12, padding: 14, background: "var(--gh-surface)" }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--gh-text-muted)" }}>{label}</p>
      <strong style={{ display: "block", marginTop: 5, fontSize: 20 }}>{value}</strong>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--gh-text-muted)", lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</p>
    </div>
  );
}

const tabStyle: React.CSSProperties = {
  border: "1px solid var(--gh-border)", borderRadius: 999, padding: "9px 14px",
  fontWeight: 700, cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", marginTop: 7, padding: 11,
  border: "1px solid var(--gh-border)", borderRadius: 7,
  background: "var(--gh-surface)", color: "var(--gh-text)", font: "inherit",
};

const buttonStyle: React.CSSProperties = {
  border: 0, borderRadius: 7, padding: "11px 16px", background: "#334155",
  color: "white", fontWeight: 700, cursor: "pointer",
};