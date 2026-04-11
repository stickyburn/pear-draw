/**
 * Escape HTML special characters to prevent XSS in template literals.
 * Used by SweetAlert2 modal HTML strings.
 */
export function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}