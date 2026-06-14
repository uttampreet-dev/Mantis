/**
 * Splits text into overlapping word-window chunks.
 * @param text   Source text to chunk
 * @param size   Target words per chunk (default 400)
 * @param overlap Words to repeat at the start of each successive chunk (default 50)
 */
export function chunkByWords(text: string, size = 400, overlap = 50): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  const step = Math.max(1, size - overlap);

  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + size).join(" ");
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}
