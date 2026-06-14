import { extractText } from "unpdf";

/**
 * Returns one string per page from a PDF ArrayBuffer.
 * Pages with no extractable text are returned as empty strings.
 */
export async function extractPDFPages(buffer: ArrayBuffer): Promise<string[]> {
  const uint8 = new Uint8Array(buffer);
  const { text } = await extractText(uint8, { mergePages: false });
  return text;
}
