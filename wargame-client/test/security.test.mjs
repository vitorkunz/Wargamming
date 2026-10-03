import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sanitizeRedirectPath,
  isAllowedImageMimeType,
  sanitizeSvg,
  MAX_PLANNING_UNITS_PER_FACTION,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
} from '../src/lib/security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Security Audit & Remediation Verification', () => {
  describe('1. Open Redirect Mitigation (src/lib/security.ts & auth/callback)', () => {
    it('allows valid internal relative paths', () => {
      assert.equal(sanitizeRedirectPath('/'), '/');
      assert.equal(sanitizeRedirectPath('/dashboard'), '/dashboard');
      assert.equal(sanitizeRedirectPath('/moderator'), '/moderator');
      assert.equal(sanitizeRedirectPath('/player?tab=battle'), '/player?tab=battle');
      assert.equal(sanitizeRedirectPath('/auth/login#section'), '/auth/login#section');
    });

    it('rejects external absolute URLs', () => {
      assert.equal(sanitizeRedirectPath('https://example.com'), '/');
      assert.equal(sanitizeRedirectPath('http://evil.com'), '/');
      assert.equal(sanitizeRedirectPath('ftp://attacker.com'), '/');
      assert.equal(sanitizeRedirectPath('https://evil.com/phishing'), '/');
    });

    it('rejects protocol-relative URLs (//)', () => {
      assert.equal(sanitizeRedirectPath('//example.com'), '/');
      assert.equal(sanitizeRedirectPath('//attacker.com/steal-session'), '/');
      assert.equal(sanitizeRedirectPath('///triple-slash.com'), '/');
    });

    it('rejects backslash bypass vectors', () => {
      assert.equal(sanitizeRedirectPath('/\\example.com'), '/');
      assert.equal(sanitizeRedirectPath('\\evil.com'), '/');
      assert.equal(sanitizeRedirectPath('/test\\evil.com'), '/');
      assert.equal(sanitizeRedirectPath('\\\\attacker.com'), '/');
    });

    it('rejects javascript and data URIs', () => {
      assert.equal(sanitizeRedirectPath('javascript:alert(1)'), '/');
      assert.equal(sanitizeRedirectPath('data:text/html,<script>alert(1)</script>'), '/');
    });

    it('handles empty, null, and non-string inputs safely', () => {
      assert.equal(sanitizeRedirectPath(''), '/');
      assert.equal(sanitizeRedirectPath('   '), '/');
      assert.equal(sanitizeRedirectPath(null), '/');
      assert.equal(sanitizeRedirectPath(undefined), '/');
      assert.equal(sanitizeRedirectPath(123), '/');
    });
  });

  describe('2. Tactical Layer Upload - SVG Support & Stored XSS Neutralization', () => {
    it('accepts valid raster images and SVG vector files', () => {
      assert.equal(isAllowedImageMimeType('image/png', 'tactical-map.png'), true);
      assert.equal(isAllowedImageMimeType('image/jpeg', 'tactical-map.jpg'), true);
      assert.equal(isAllowedImageMimeType('image/jpeg', 'tactical-map.jpeg'), true);
      assert.equal(isAllowedImageMimeType('image/webp', 'tactical-map.webp'), true);
      assert.equal(isAllowedImageMimeType('image/svg+xml', 'tactical-map.svg'), true);
      assert.equal(isAllowedImageMimeType('image/svg', 'tactical-map.svg'), true);
    });

    it('is case-insensitive for MIME type and file extension', () => {
      assert.equal(isAllowedImageMimeType('IMAGE/PNG', 'MAP.PNG'), true);
      assert.equal(isAllowedImageMimeType('IMAGE/SVG+XML', 'MAP.SVG'), true);
      assert.equal(isAllowedImageMimeType('image/JPEG', 'photo.JPG'), true);
    });

    it('rejects spoofed extension payloads (e.g. HTML named as PNG or SVG)', () => {
      assert.equal(isAllowedImageMimeType('image/jpeg', 'exploit.html'), false);
      assert.equal(isAllowedImageMimeType('image/webp', 'exploit.js'), false);
      assert.equal(isAllowedImageMimeType('image/svg+xml', 'exploit.exe'), false);
    });

    it('rejects executable scripts, HTML, and arbitrary file types', () => {
      assert.equal(isAllowedImageMimeType('text/html', 'index.html'), false);
      assert.equal(isAllowedImageMimeType('application/javascript', 'payload.js'), false);
      assert.equal(isAllowedImageMimeType('application/pdf', 'doc.pdf'), false);
      assert.equal(isAllowedImageMimeType('application/octet-stream', 'bin.exe'), false);
    });

    it('rejects missing or empty MIME types', () => {
      assert.equal(isAllowedImageMimeType('', 'map.svg'), false);
      assert.equal(isAllowedImageMimeType(null, 'map.svg'), false);
      assert.equal(isAllowedImageMimeType(undefined, 'map.svg'), false);
    });

    it('whitelists both raster images and SVG', () => {
      assert.ok(ALLOWED_IMAGE_MIME_TYPES.includes('image/svg+xml'));
      assert.ok(ALLOWED_IMAGE_EXTENSIONS.includes('svg'));
    });

    describe('SVG Content Sanitizer (sanitizeSvg)', () => {
      it('strips <script> tags from SVG markup', () => {
        const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.domain)</script><circle cx="50" cy="50" r="40"/></svg>';
        const cleaned = sanitizeSvg(maliciousSvg);
        assert.ok(!cleaned.includes('<script'));
        assert.ok(!cleaned.includes('alert('));
        assert.ok(cleaned.includes('<circle'));
      });

      it('strips inline on* event handlers (e.g. onload, onclick, onerror)', () => {
        const maliciousSvg = '<svg onload="alert(1)" onclick="steal()"><rect width="100" height="100"/></svg>';
        const cleaned = sanitizeSvg(maliciousSvg);
        assert.ok(!cleaned.includes('onload'));
        assert.ok(!cleaned.includes('onclick'));
        assert.ok(!cleaned.includes('alert(1)'));
        assert.ok(cleaned.includes('<rect'));
      });

      it('strips javascript: URIs in href and xlink:href', () => {
        const maliciousSvg = '<svg><a href="javascript:alert(1)"><text>Click</text></a><a xlink:href="javascript:steal()"><text>XLink</text></a></svg>';
        const cleaned = sanitizeSvg(maliciousSvg);
        assert.ok(!cleaned.includes('javascript:'));
        assert.ok(cleaned.includes('<text>Click</text>'));
      });

      it('strips <foreignObject> tags that could contain raw HTML', () => {
        const maliciousSvg = '<svg><foreignObject><iframe src="evil.com"></iframe></foreignObject><path d="M0 0 L10 10"/></svg>';
        const cleaned = sanitizeSvg(maliciousSvg);
        assert.ok(!cleaned.includes('<foreignObject'));
        assert.ok(!cleaned.includes('<iframe'));
        assert.ok(cleaned.includes('<path'));
      });

      it('preserves clean vector shapes, groups, and styles untouched', () => {
        const cleanSvg = '<svg width="500" height="500" viewBox="0 0 500 500"><g fill="#00ff00"><path d="M 10 10 L 90 90" stroke="#000"/></g></svg>';
        const cleaned = sanitizeSvg(cleanSvg);
        assert.ok(cleaned.includes('viewBox="0 0 500 500"'));
        assert.ok(cleaned.includes('<path d="M 10 10 L 90 90"'));
      });
    });
  });

  describe('3. DoS via Duplication Spamming (High Quota Safeguard)', () => {
    it('defines a generous safety quota ceiling of 1000 units per faction to allow full gameplay', () => {
      assert.equal(MAX_PLANNING_UNITS_PER_FACTION, 1000);
      assert.ok(MAX_PLANNING_UNITS_PER_FACTION >= 500, 'Must not restrict to low numbers like 50/60');
    });
  });

  describe('4. SQL Security Migration File Verification', () => {
    const migrationPath = path.resolve(__dirname, '../supabase/supabase_security_hardening.sql');

    it('verifies supabase_security_hardening.sql exists', () => {
      assert.ok(fs.existsSync(migrationPath), 'Migration file should exist');
    });

    it('contains protect_profile_role trigger against role privilege escalation', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      assert.ok(sql.includes('protect_profile_role()'), 'Must define protect_profile_role()');
      assert.ok(sql.includes('tr_protect_profile_role'), 'Must create tr_protect_profile_role trigger');
      assert.ok(sql.includes('BEFORE UPDATE ON public."Profiles"'), 'Must target Profiles before update');
      assert.ok(sql.includes('Access Denied: Only Moderators can modify user roles'), 'Must include role check');
    });

    it('contains restricted RPC execute permissions and caller role verification', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      assert.ok(sql.includes('REVOKE EXECUTE ON FUNCTION public.publish_draft_to_live() FROM PUBLIC, anon'), 'Must revoke publish_draft_to_live from public/anon');
      assert.ok(sql.includes('REVOKE EXECUTE ON FUNCTION public.sync_draft_from_live() FROM PUBLIC, anon'), 'Must revoke sync_draft_from_live from public/anon');
      assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.publish_draft_to_live() TO authenticated'), 'Must grant publish_draft_to_live to authenticated');
      assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.sync_draft_from_live() TO authenticated'), 'Must grant sync_draft_from_live to authenticated');
      assert.ok(sql.includes("caller_role != 'Moderator'"), 'Must verify caller is Moderator inside RPCs');
    });

    it('contains REPLICA IDENTITY FULL for fog-of-war real-time protection', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      assert.ok(sql.includes('ALTER TABLE public."Battle_Units" REPLICA IDENTITY FULL;'), 'Must set REPLICA IDENTITY FULL on Battle_Units');
      assert.ok(sql.includes('ALTER TABLE public."Battle_Hazards" REPLICA IDENTITY FULL;'), 'Must set REPLICA IDENTITY FULL on Battle_Hazards');
      assert.ok(sql.includes('ALTER TABLE public."Map_POIs" REPLICA IDENTITY FULL;'), 'Must set REPLICA IDENTITY FULL on Map_POIs');
    });

    it('allows both raster images and SVG vector maps in storage bucket', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      assert.ok(sql.includes("UPDATE storage.buckets"), 'Must update storage.buckets');
      assert.ok(sql.includes("'image/svg+xml'"), 'Must allow image/svg+xml');
      assert.ok(sql.includes("WHERE id = 'maps'"), 'Must target maps bucket');
    });

    it('contains check_planning_units_quota trigger with generous 1000 ceiling', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      assert.ok(sql.includes('check_planning_units_quota()'), 'Must define check_planning_units_quota()');
      assert.ok(sql.includes('tr_check_planning_units_quota'), 'Must create tr_check_planning_units_quota trigger');
      assert.ok(sql.includes('BEFORE INSERT ON public."Planning_Units"'), 'Must trigger before insert on Planning_Units');
      assert.ok(sql.includes('1000'), 'Must enforce generous 1000 quota instead of low cap');
    });
  });
});
