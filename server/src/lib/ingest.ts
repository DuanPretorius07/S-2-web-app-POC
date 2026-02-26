/**
 * Optional debug ingest. Only sends when INGEST_URL is set (e.g. in dev).
 * In production do not set INGEST_URL so no localhost/device URLs appear in logs.
 */
export function ingestLog(payload: Record<string, unknown>): void {
  const url = process.env.INGEST_URL;
  if (!url) return;
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // noop
  }
}
