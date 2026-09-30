"use client";

export default function ArticleRetryButton() {
  function handleRetry() {
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleRetry}
      style={{
        padding: "10px 20px",
        background: "var(--gh-control-active)",
        color: "var(--gh-control-active-text)",
        border: "none",
        borderRadius: "6px",
        fontWeight: "bold",
        cursor: "pointer",
        fontSize: "14px",
      }}
    >
      다시 시도
    </button>
  );
}
