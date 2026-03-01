// ─── Formqo subdomain constants ──────────────────────────────────────────────
export const MARKETING_URL = "https://formqo.com";
export const APP_URL = "https://app.formqo.com";
export const SHARE_URL = "https://share.formqo.com";
export const EMBED_URL = "https://embed.formqo.com";
export const API_URL = "https://api.formqo.com";

export function getShareUrl(formId: string) {
  return `${SHARE_URL}/f/${formId}`;
}

export function getEmbedUrl(formId: string) {
  return `${EMBED_URL}/${formId}.js`;
}

export function getEmbedSnippet(formId: string) {
  return `<div id="formqo-${formId}"></div>\n<script src="${getEmbedUrl(formId)}" async></script>`;
}
