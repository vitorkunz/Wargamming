/**
 * Security utilities for Gabinete de Guerra UFSMUN
 */

/**
 * Validates and sanitizes destination redirect path to prevent Open Redirect vulnerabilities.
 * Allows only safe relative paths starting with a single '/' and not '//' or containing '\'.
 */
export function sanitizeRedirectPath(next: string | null | undefined): string {
  if (!next || typeof next !== 'string') {
    return '/';
  }

  const trimmed = next.trim();

  // Must start with exactly one slash, not two (which indicates protocol-relative URLs e.g. //attacker.com)
  // Must not contain backslashes which can be used to trick URL parsers (e.g. /\attacker.com)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }

  return '/';
}

/**
 * Allowed MIME types for tactical layer map uploads.
 * Supports raster images (PNG, JPEG, WebP) and vector images (SVG).
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'] as const;

/**
 * Validates that an uploaded file is strictly an allowed image type and extension.
 */
export function isAllowedImageMimeType(
  mimeType: string | null | undefined,
  fileName?: string
): boolean {
  if (!mimeType) return false;
  const normalizedMime = mimeType.trim().toLowerCase();

  // Allow standard image mime types or SVG
  const isMimeAllowed =
    ALLOWED_IMAGE_MIME_TYPES.some((t) => t === normalizedMime) ||
    normalizedMime === 'image/svg';

  if (!isMimeAllowed) {
    return false;
  }

  if (fileName) {
    const ext = fileName.split('.').pop()?.trim().toLowerCase();
    if (!ext || !ALLOWED_IMAGE_EXTENSIONS.some((e) => e === ext)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes SVG markup to prevent Stored Cross-Site Scripting (XSS).
 * Removes executable script elements, embedded foreign objects,
 * inline event handlers (onload, onerror, onclick, etc.), and dangerous URI schemes.
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') {
    return '';
  }

  // 1. If DOMParser is available (Browser context), use DOM tree cleaning
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    try {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');

      const parserError = doc.querySelector('parsererror');
      if (!parserError) {
        // Remove dangerous elements
        const dangerousTags = ['script', 'foreignobject', 'iframe', 'embed', 'object', 'applet', 'meta', 'link'];
        dangerousTags.forEach((tag) => {
          const elements = doc.querySelectorAll(tag);
          elements.forEach((el) => el.remove());
        });

        // Strip inline event handler attributes and dangerous href schemes
        const allElements = doc.querySelectorAll('*');
        allElements.forEach((el) => {
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const attrName = attr.name.toLowerCase();
            const attrValue = attr.value.trim().toLowerCase();

            if (attrName.startsWith('on')) {
              el.removeAttribute(attr.name);
              continue;
            }

            if (
              (attrName === 'href' || attrName === 'xlink:href' || attrName === 'src') &&
              (attrValue.startsWith('javascript:') || attrValue.startsWith('data:text/html') || attrValue.startsWith('vbscript:'))
            ) {
              el.removeAttribute(attr.name);
            }
          }
        });

        const serializer = new XMLSerializer();
        return serializer.serializeToString(doc.documentElement);
      }
    } catch {
      // Fallback to regex cleaning below
    }
  }

  // 2. Regex-based cleaning (universal / Node.js fallback)
  let clean = svgContent;

  // Remove <script ...>...</script> and self-closing <script .../>
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<script\b[^>]*\/>/gi, '');

  // Remove <foreignObject ...>...</foreignObject>
  clean = clean.replace(/<foreignobject\b[^<]*(?:(?!<\/foreignobject>)<[^<]*)*<\/foreignobject>/gi, '');
  clean = clean.replace(/<foreignobject\b[^>]*\/>/gi, '');

  // Remove other dangerous embedding tags
  clean = clean.replace(/<(?:iframe|embed|object|applet)\b[^<]*(?:(?!<\/(?:iframe|embed|object|applet)>)<[^<]*)*<\/(?:iframe|embed|object|applet)>/gi, '');

  // Remove inline on* attributes (e.g. onload="...", onclick='...', onerror=alert(1))
  clean = clean.replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript: or data:text/html inside href or xlink:href
  clean = clean.replace(/\s+(?:xlink:)?href\s*=\s*["']?\s*(?:javascript:|data:text\/html)[^"'>\s]*["']?/gi, '');

  return clean;
}

/**
 * Maximum quota of planning units allowed per faction to prevent runaway DoS / infinite-loop database floods.
 * Set to a high ceiling of 1000 units to allow full-scale military simulation without restricting gameplay.
 */
export const MAX_PLANNING_UNITS_PER_FACTION = 1000;
