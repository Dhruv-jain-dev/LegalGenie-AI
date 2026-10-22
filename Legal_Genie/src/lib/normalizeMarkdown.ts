/** Apply only presentation-safe cleanup to model-generated Markdown. */
export function normalizeMarkdown(content: string): string {
  let normalized = content.replace(/\r\n?/g, '\n').trim();

  // Models occasionally wrap an entire answer in a single Markdown code fence.
  const fencedResponse = normalized.match(/^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (fencedResponse) normalized = fencedResponse[1].trim();

  const lines = normalized.split('\n');
  const lastLine = lines.length ? lines[lines.length - 1].trim().toLowerCase() : '';
  const containsMarkdown = lines.slice(0, -1).some((line) => /^(#{1,6}\s|[-*+]\s|\d+\.\s|---+$|```)|\*\*/.test(line.trim()));
  // Restrict this to a standalone final serialization artifact, never normal prose.
  if (lastLine === 'svg' && containsMarkdown) lines.pop();

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
