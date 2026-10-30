import manifest from "@/data/media-manifest.json";

/**
 * Public URL of a media file referenced as `media/...` in the data.
 *
 * Uploaded files resolve to their Vercel Blob URL (src/data/media-manifest.json,
 * written by scripts/upload-media.ts); others are served from public/media.
 * Swapping storage (e.g. Cloudflare R2) only means changing the manifest.
 */
export function mediaUrl(path: string): string {
  const key = path.replace(/^\/+/, "");
  const uploaded = (manifest as Record<string, string>)[key];
  return uploaded ?? `/${key}`;
}
