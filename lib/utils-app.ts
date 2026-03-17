const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function assetDownloadUrl(assetId: string): string {
  return `${API_BASE}/api/assets/${assetId}/download`;
}

export function assetMeshProxyUrl(assetId: string): string {
  return `/proxy/assets/${assetId}/download`;
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function formatDuration(start?: string, end?: string): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diffSec = Math.floor((e - s) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const m = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  return `${m}m ${sec}s`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

/** Derive a display filename from file_path when the API doesn't return a filename field. */
export function assetFilename(asset: { filename?: string; file_path: string }): string {
  if (asset.filename) return asset.filename;
  // file_path is an absolute path like /app/output/ComfyUI/abc.glb
  const parts = asset.file_path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || asset.file_path;
}
