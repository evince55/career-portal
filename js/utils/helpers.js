/** Escape HTML entities to prevent XSS attacks (Node.js & browser compatible) */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  
  // Prevent null byte injection attacks
  let escaped = str.replace(/\0/g, '');
  
  // Order matters: & must be first to avoid double-escaping
  return escaped
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;'); // Prevent </script> injection
}

/** Normalize a search slug: lowercase, collapse spaces/h dashes to single hyphen */
export function normalizeSlug(str) {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().replace(/\s+/g, '-').replace(/-/g, '');
}
