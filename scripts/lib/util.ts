/** "Djôrô" -> "djoro", "Fada N’Gourma" -> "fada-n-gourma". */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Parses `POINT (lon lat)`; returns undefined for anything else. */
export function parseWktPoint(wkt: string): [number, number] | undefined {
  const m = /^\s*POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)\s*$/i.exec(wkt);
  if (!m) return undefined;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : undefined;
}

/**
 * Only media we host ourselves may be shown: paths inside media/ (resolved
 * by mediaUrl()) or our Vercel Blob store. Third-party URLs from the
 * ontology (Bing, Wikipédia…) have no established rights.
 */
export function isAllowedMediaUrl(url: string): boolean {
  if (url.startsWith("media/") || url.startsWith("/media/")) return true;
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
