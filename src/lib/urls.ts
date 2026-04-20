// ─── Formqo URL helpers ──────────────────────────────────────────────────────
// Everything is served from a single origin (typically https://formqo.com).
// Helpers derive absolute URLs from window.location at runtime so they work
// across preview, production, and custom domains without hard-coding hosts.

function getOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://formqo.com";
}

export function getShareUrl(formId: string) {
  return `${getOrigin()}/f/${formId}`;
}

export function getEmbedSnippet(formId: string) {
  const src = `${getOrigin()}/embed/${formId}.js`;
  return `<div id="formqo-${formId}"></div>\n<script src="${src}" async></script>`;
}
