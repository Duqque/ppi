/* ============================================================
 * Accès protégé par mot de passe partagé (pas de comptes multiples —
 * un seul mot de passe pour accéder au dossier PPI).
 *
 * Variables d'environnement :
 *   SITE_PASSWORD    mot de passe requis pour entrer (défaut : "studency")
 *   SESSION_SECRET   secret de signature du cookie de session
 *                     (défaut fourni, mais À CHANGER sur Hostinger)
 * ============================================================ */

const crypto = require('crypto');

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'studency';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ppi-duquenne-change-me-in-hostinger-env';
const COOKIE_NAME = 'ppi_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

// Chemins accessibles sans connexion (page de login elle-même + assets partagés
// non sensibles : CSS/JS/fonts/logos, utilisés à la fois par le login et le site).
const PUBLIC_PATHS = new Set(['/login.html', '/api/login']);
const PUBLIC_PREFIXES = ['/css/', '/js/', '/assets/fonts/', '/assets/logo/', '/assets/login-photo.jpg'];

// Chemins explicitement protégés (le contenu réel du dossier).
const PROTECTED_PREFIXES = ['/assets/cv/', '/assets/portfolio/', '/assets/photos/'];

function sign(value) {
  const h = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
  return `${value}.${h}`;
}

function verify(signed) {
  if (!signed || typeof signed !== 'string') return false;
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return false;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
  try {
    return value === 'ok' && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function isAuthed(req) {
  return verify(parseCookies(req)[COOKIE_NAME]);
}

function setSessionCookie(res) {
  const token = sign('ok');
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

function isPathProtected(urlPath) {
  if (PUBLIC_PATHS.has(urlPath)) return false;
  if (PUBLIC_PREFIXES.some((p) => urlPath.startsWith(p))) return false;
  if (urlPath === '/' || urlPath === '/index.html') return true;
  if (PROTECTED_PREFIXES.some((p) => urlPath.startsWith(p))) return true;
  if (urlPath.startsWith('/api/')) return true; // toutes les API nécessitent une session
  return false;
}

function requireAuth(req, res, next) {
  const urlPath = req.path;
  if (!isPathProtected(urlPath)) return next();
  if (isAuthed(req)) return next();

  if (urlPath.startsWith('/api/') || urlPath.startsWith('/assets/')) {
    return res.status(401).json({ error: 'Connexion requise.' });
  }
  return res.redirect(`/login.html?next=${encodeURIComponent(urlPath)}`);
}

module.exports = {
  SITE_PASSWORD,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  isAuthed,
};
