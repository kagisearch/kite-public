/**
 * Return the base URL for API calls.
 * - If VITE_API_BASE is provided at build time, use it (trim trailing slash).
 * - Otherwise default to the app's internal proxy prefix: "/api".
 */
export function getApiBaseUrl(): string {
  // Prefer Node env when available (e.g., Vitest integration), then Vite's import.meta.env
  const processLike = typeof process !== 'undefined'
    ? (process as unknown as { env?: Record<string, unknown> })
    : undefined;
  const nodeEnvValue = typeof processLike?.env?.VITE_API_BASE === 'string'
    ? (processLike?.env?.VITE_API_BASE as string)
    : undefined;
  if (nodeEnvValue && nodeEnvValue.length > 0) {
    return nodeEnvValue.replace(/\/+$/, "");
  }
  // Avoid dynamic access to import.meta.env in Vite SSR
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const metaEnv = (import.meta as { env: Record<string, unknown> }).env;
  const metaEnvBase = metaEnv && (metaEnv.VITE_API_BASE as string | undefined);
  if (typeof metaEnvBase === "string" && metaEnvBase.length > 0) {
    return metaEnvBase.replace(/\/+$/, "");
  }
  return "/api";
}
