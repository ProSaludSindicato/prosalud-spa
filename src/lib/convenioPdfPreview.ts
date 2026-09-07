const DEFAULT_CONVENIO_PAGE_COUNT = 2;
const MAX_SANE_PAGE_COUNT = 50;

export async function getPdfPageCount(blob: Blob): Promise<number> {
  try {
    const buffer = await blob.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buffer);
    const matches = [...text.matchAll(/\/Count\s+(\d+)/g)];

    if (matches.length === 0) {
      return DEFAULT_CONVENIO_PAGE_COUNT;
    }

    const counts = matches
      .map((match) => Number.parseInt(match[1], 10))
      .filter((count) => count > 0 && count <= MAX_SANE_PAGE_COUNT);

    if (counts.length === 0) {
      return DEFAULT_CONVENIO_PAGE_COUNT;
    }

    return Math.max(...counts);
  } catch {
    return DEFAULT_CONVENIO_PAGE_COUNT;
  }
}

export function buildConvenioPdfEmbedSrc(objectUrl: string, page: number): string {
  return `${objectUrl}#page=${page}&view=FitV&toolbar=0&navpanes=0`;
}
