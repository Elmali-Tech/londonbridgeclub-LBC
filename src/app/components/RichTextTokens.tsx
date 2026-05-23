"use client";

import React from "react";
import { createTextTokenRegex } from "@/lib/textTokens";

type RichTextTokensProps = {
  text?: string | null;
  fallback?: string;
  className?: string;
};

export default function RichTextTokens({
  text,
  fallback = "",
  className,
}: RichTextTokensProps) {
  const content = text || fallback;

  if (!content) {
    return null;
  }

  const regex = createTextTokenRegex();
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of content.matchAll(regex)) {
    const token = match[1];
    const index = match.index ?? 0;

    if (index > cursor) {
      parts.push(content.slice(cursor, index));
    }

    const isMention = token.startsWith("@");
    parts.push(
      <span
        key={`${token}-${index}`}
        className={
          isMention
            ? "font-bold text-blue-600 dark:text-blue-400"
            : "font-bold text-amber-600 dark:text-amber-400"
        }
      >
        {token}
      </span>,
    );
    cursor = index + token.length;
  }

  if (cursor < content.length) {
    parts.push(content.slice(cursor));
  }

  return <span className={className}>{parts}</span>;
}
