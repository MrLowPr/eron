import Link from "next/link";
import { cn, truncate } from "@/lib/utils";

/**
 * Renders post/comment content as React nodes (never raw HTML → XSS-safe).
 * Recognizes bare URLs and @mentions as links.
 */

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;
const MENTION_PATTERN = /(@[a-zA-Z0-9_-]{3,24})\b/g;

function TextWithLinks({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  // Combined tokenizer for URLs and mentions.
  const combined = new RegExp(
    `(${URL_PATTERN.source})|(${MENTION_PATTERN.source})`,
    "g"
  );

  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [full, url, mention] = match;
    if (url) {
      nodes.push(
        <a
          key={`u-${key}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
        >
          {truncate(url, 48)}
        </a>
      );
    } else if (mention) {
      nodes.push(
        <LinkMention key={`m-${key}`} username={mention.slice(1)} />
      );
    }
    lastIndex = match.index + full.length;
    key += 1;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return <>{nodes}</>;
}

function LinkMention({ username }: { username: string }) {
  return (
    <Link
      href={`/u/${username.toLowerCase()}`}
      className="text-primary hover:underline"
    >
      @{username}
    </Link>
  );
}

export function PostContent({ content, className }: { content: string; className?: string }) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    paragraphs.push(content.trim());
  }

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line break-words">
          <TextWithLinks text={paragraph} />
        </p>
      ))}
    </div>
  );
}
