import { Fragment, type ReactNode } from "react";
import { linkifyPlainText } from "@/lib/linkify";
import { splitPostContent } from "@/lib/postImages";
import { getSocialEmbed } from "@/lib/socialEmbeds";
import SocialEmbedCard from "@/components/SocialEmbedCard";

const MAX_SOCIAL_EMBEDS = 5;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = new Set([".", ",", "!", "?", ":", ";"]);

function trimUrlCandidate(value: string): [string, string] {
  let end = value.length;
  while (end > 0 && TRAILING_PUNCTUATION.has(value[end - 1])) end -= 1;
  return [value.slice(0, end), value.slice(end)];
}

function renderTextWithEmbeds(text: string, remaining: number): { nodes: ReactNode[]; used: number } {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let used = 0;
  let key = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    if (used >= remaining) break;

    const start = match.index ?? 0;
    const candidate = match[0];
    const [urlText, trailingText] = trimUrlCandidate(candidate);
    const embed = getSocialEmbed(urlText);
    if (!embed) continue;

    if (start > cursor) {
      nodes.push(
        <span key={`text-${key++}`} style={{ whiteSpace: "pre-wrap" }}>
          {linkifyPlainText(text.slice(cursor, start))}
        </span>,
      );
    }
    nodes.push(<SocialEmbedCard key={`embed-${key++}`} embed={embed} />);
    if (trailingText) {
      nodes.push(
        <span key={`trail-${key++}`} style={{ whiteSpace: "pre-wrap" }}>
          {trailingText}
        </span>,
      );
    }

    cursor = start + candidate.length;
    used += 1;
  }

  if (cursor < text.length) {
    nodes.push(
      <span key={`text-${key++}`} style={{ whiteSpace: "pre-wrap" }}>
        {linkifyPlainText(text.slice(cursor))}
      </span>,
    );
  }

  return { nodes, used };
}

export default function PostContent({ content }: { content: string }) {
  const parts = splitPostContent(content);
  const rendered = parts.reduce<{ nodes: ReactNode[]; used: number }>(
    (result, part, index) => {
      if (part.type === "image") {
        const image = (
          <figure className="post-inline-image" key={`${part.url}-${index}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={part.url} alt="게시글 첨부 이미지" loading="lazy" />
          </figure>
        );
        return { nodes: [...result.nodes, image], used: result.used };
      }

      const text = renderTextWithEmbeds(part.value, MAX_SOCIAL_EMBEDS - result.used);
      return {
        nodes: [...result.nodes, <Fragment key={index}>{text.nodes}</Fragment>],
        used: result.used + text.used,
      };
    },
    { nodes: [], used: 0 },
  );

  return (
    <div className="post-content" style={{ fontSize: "16px", lineHeight: "1.8" }}>
      {rendered.nodes}
    </div>
  );
}
