import { marked } from "marked";

/**
 * Renders a Journal post's Markdown body to HTML, resolving (inline:N)
 * image placeholders to the real attachment URL first.
 *
 * Writers reference an uploaded "Inline Images" attachment with standard
 * Markdown image syntax where the URL is the literal text "inline:N"
 * (1-indexed, matching upload order) - e.g. `![A misty morning at the
 * distillery](inline:1)`. This keeps the writing format plain Markdown
 * (no Airtable-specific syntax to remember) while still letting each
 * post control exactly where its images land in the text.
 */
export function renderJournalBody(body: string, inlineImages: string[]): string {
  const withResolvedImages = body.replace(/\(inline:(\d+)\)/g, (match, indexStr) => {
    const index = parseInt(indexStr, 10) - 1;
    const url = inlineImages[index];
    if (!url) {
      // Leave a visible marker rather than silently dropping a broken
      // reference - easier to spot in a preview than a missing image.
      return `(missing inline image ${indexStr})`;
    }
    return `(${url})`;
  });

  return marked.parse(withResolvedImages, { async: false }) as string;
}

/** ~200 words/minute, rounded up to the nearest minute, minimum 1. */
export function estimateReadMinutes(body: string): number {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
