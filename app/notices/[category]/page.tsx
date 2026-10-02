import Link from "next/link";
import { notFound } from "next/navigation";
import { BOARD_NOTICES, getBoardNotice } from "@/lib/board-notices";
import { getCategoryLabel } from "@/lib/constants";

export function generateStaticParams() {
  return BOARD_NOTICES.map((notice) => ({ category: notice.category }));
}

export default async function BoardNoticePage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!BOARD_NOTICES.some((notice) => notice.category === category)) notFound();

  const notice = getBoardNotice(category);
  const boardLabel = category === "all" ? "전체글" : getCategoryLabel(category, "ko");
  const boardHref = category === "all"
    ? "/?section=community"
    : "/?section=community&category=" + category;

  return (
    <main style={{ minHeight: "80vh", padding: "36px 0 80px", background: "var(--gh-page-bg)" }}>
      <article style={{ maxWidth: "820px", margin: "0 auto", padding: "0 20px" }}>
        <Link href={boardHref} style={{ color: "var(--gh-text-muted)", textDecoration: "none", fontSize: 14 }}>← {boardLabel} 게시판</Link>
        <header style={{ marginTop: 22, paddingBottom: 20, borderBottom: "1px solid var(--gh-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <span style={{ background: "var(--gh-control-active)", color: "var(--gh-control-active-text)", padding: "4px 9px", fontSize: 12, fontWeight: 800 }}>공지</span>
            <span style={{ color: "var(--gh-text-muted)", fontSize: 13 }}>{boardLabel}</span>
          </div>
          <h1 style={{ margin: "0 0 12px", color: "var(--gh-text)", fontSize: "clamp(22px, 5vw, 30px)", lineHeight: 1.35 }}>[공지] {notice.title}</h1>
          <div style={{ display: "flex", gap: 10, color: "var(--gh-text-muted)", fontSize: 13 }}><strong style={{ color: "var(--gh-text)" }}>관리자</strong><span>GermanHanguk</span></div>
        </header>
        <div style={{ padding: "28px 0", color: "var(--gh-text)", fontSize: 15, lineHeight: 1.85 }}>
          <p style={{ margin: "0 0 22px" }}>{notice.intro}</p>
          <ul style={{ margin: "0 0 22px", paddingLeft: 22 }}>
            {notice.points.map((point) => <li key={point} style={{ marginBottom: 9 }}>{point}</li>)}
          </ul>
          {notice.caution && <p style={{ margin: "24px 0 0", padding: "14px 16px", background: "var(--gh-surface-muted)", borderLeft: "3px solid var(--gh-accent)" }}>{notice.caution}</p>}
          <p style={{ margin: "30px 0 0" }}>처음 오셨다면 부담 없이 글을 남겨주세요. 서로의 경험 하나가 다음 사람에게 큰 도움이 됩니다. 🙂</p>
        </div>
        <div style={{ borderTop: "1px solid var(--gh-border)", paddingTop: 20 }}>
          <Link href={boardHref} style={{ display: "inline-block", textDecoration: "none", color: "var(--gh-control-active-text)", background: "var(--gh-control-active)", padding: "9px 14px", fontWeight: 700, fontSize: 13 }}>게시판으로 돌아가기</Link>
        </div>
      </article>
    </main>
  );
}
