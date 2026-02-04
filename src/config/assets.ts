/**
 * Centralized asset URL management.
 * Allows switching between local public folder and R2/CDN bucket via environment variable.
 */
const ASSET_BASE_URL = (import.meta.env.VITE_ASSETS_URL as string) || "";

export const getAssetUrl = (path: string): string => {
  // If path is already absolute http, return it
  if (path.startsWith("http")) return path;

  // Ensure path starts with slash for consistency
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // If local (no env var), return relative path to public folder
  if (!ASSET_BASE_URL) return normalizedPath;

  // Remove trailing slash from base if present to avoid double slash
  const cleanBase = ASSET_BASE_URL.endsWith("/")
    ? ASSET_BASE_URL.slice(0, -1)
    : ASSET_BASE_URL;

  return `${cleanBase}${normalizedPath}`;
};
