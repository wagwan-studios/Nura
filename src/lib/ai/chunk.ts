export function chunkText(text: string, maxChars = 1800) {
  const clean = text.replace(/\s+/g, " ").trim();

  if (!clean) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = start + maxChars;

    if (end < clean.length) {
      const lastPeriod = clean.lastIndexOf(".", end);

      if (lastPeriod > start + 500) {
        end = lastPeriod + 1;
      }
    }

    chunks.push(clean.slice(start, end).trim());
    start = end;
  }

  return chunks;
}