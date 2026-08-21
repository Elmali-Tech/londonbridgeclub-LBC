export type TextToken = {
  type: "mention" | "hashtag";
  value: string;
  label: string;
};

export const createTextTokenRegex = () => /([@#][^\s@#.,;:!?()[\]{}"'<>]+)/g;

export const extractTextTokens = (text?: string | null): TextToken[] => {
  if (!text) return [];

  const tokens = new Map<string, TextToken>();
  const regex = createTextTokenRegex();

  for (const match of text.matchAll(regex)) {
    const value = match[1];
    if (!value || value.length < 2) continue;

    const type = value.startsWith("@") ? "mention" : "hashtag";
    const key = `${type}:${value.toLowerCase()}`;

    if (!tokens.has(key)) {
      tokens.set(key, {
        type,
        value,
        label: value.slice(1),
      });
    }
  }

  return Array.from(tokens.values());
};
