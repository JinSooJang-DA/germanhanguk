import { type ReactNode } from "react";

const URL_CANDIDATE_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = new Set([".", ",", "!", "?", ":", ";"]);

function trimTrailingPunctuation(value: string): [string, string] {
  let end = value.length;

  while (end > 0) {
    const character = value[end - 1];

    if (TRAILING_PUNCTUATION.has(character)) {
      end -= 1;
      continue;
    }

    if (
      (character === ")" && countCharacters(value.slice(0, end), "(") < countCharacters(value.slice(0, end), ")")) ||
      (character === "]" && countCharacters(value.slice(0, end), "[") < countCharacters(value.slice(0, end), "]")) ||
      (character === "}" && countCharacters(value.slice(0, end), "{") < countCharacters(value.slice(0, end), "}"))
    ) {
      end -= 1;
      continue;
    }

    break;
  }

  return [value.slice(0, end), value.slice(end)];
}

function countCharacters(value: string, character: string): number {
  return value.split(character).length - 1;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isInsideHtmlTag(value: string, position: number): boolean {
  return value.lastIndexOf("<", position) > value.lastIndexOf(">", position);
}

export function linkifyPlainText(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  for (const match of text.matchAll(URL_CANDIDATE_PATTERN)) {
    const start = match.index ?? 0;
    const candidate = match[0];
    const [urlText, trailingText] = trimTrailingPunctuation(candidate);

    if (!urlText || isInsideHtmlTag(text, start) || !isSafeHttpUrl(urlText)) {
      continue;
    }

    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }

    nodes.push(
      <a
        key={`link-${index}`}
        href={urlText}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
      >
        {urlText}
      </a>,
    );

    if (trailingText) {
      nodes.push(trailingText);
    }

    cursor = start + candidate.length;
    index += 1;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return <>{nodes}</>;
}
