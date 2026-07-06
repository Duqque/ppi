/* ============================================================
 * PPI Quentin Duquenne — serveur (accès protégé + envoi email Resend)
 * ============================================================
 * 1) ACCÈS PROTÉGÉ PAR MOT DE PASSE (server/auth.js)
 *    Variables d'environnement (Hostinger > Node.js > Variables
 *    d'environnement, puis "Restart" l'app après les avoir ajoutées) :
 *      SITE_PASSWORD    mot de passe d'accès (défaut : "jump2026")
 *      SESSION_SECRET   secret de signature du cookie (à changer en prod)
 *
 * 2) ENVOI TRANSACTIONNEL DU DOSSIER PPI VIA RESEND
 *    même pattern que sur rokudan-saas (server/api-emails.mjs).
 *      RESEND_API_KEY      (re_xxx — depuis resend.com/api-keys)
 *      RESEND_FROM_EMAIL   (par défaut : "Quentin Duquenne <onboarding@resend.dev>")
 *
 *    Tant qu'aucun domaine n'est vérifié sur Resend, l'adresse d'envoi par
 *    défaut "onboarding@resend.dev" ne peut envoyer QUE vers l'adresse email
 *    du compte Resend (limitation sandbox de Resend, pas un bug ici). Pour
 *    envoyer vers n'importe quelle adresse (les vrais visiteurs du site) :
 *      1. Resend -> Domains -> Add Domain -> quentinduquenne.fr (ou le domaine réel)
 *      2. Ajoute les 3 enregistrements DNS fournis chez Hostinger (DNS / Nameservers)
 *      3. Une fois vérifié, mets RESEND_FROM_EMAIL = "Quentin Duquenne <contact@quentinduquenne.fr>"
 * ============================================================ */

const express = require('express');
const path = require('path');
const { buildDossierEmailHtml } = require('./server/email-template');
const { SITE_PASSWORD, requireAuth, setSessionCookie, clearSessionCookie, isAuthed } = require('./server/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const RESEND_API = 'https://api.resend.com/emails';
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

app.use(express.json());

// ---- Auth : login/logout (avant le middleware de protection) ----
app.post('/api/login', (req, res) => {
  const password = (req.body && req.body.password) || '';
  if (password === SITE_PASSWORD) {
    setSessionCookie(res);
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Mot de passe incorrect.' });
});

app.post('/api/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  res.json({ authed: isAuthed(req) });
});

// ---- Protection d'accès : rien du dossier sans session valide ----
app.use(requireAuth);

// ---- Fichiers statiques ----
// Cache long uniquement pour les fichiers lourds et rarement modifiés
// (photos, PDF, fonts). HTML/CSS/JS restent en no-cache : ce ne sont pas
// des fichiers versionnés (pas de hash dans le nom), donc un cache long
// empêcherait les visiteurs de voir les mises à jour du site.
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (/\.(html|css|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', `public, max-age=${ONE_WEEK / 1000}`);
    }
  },
}));

async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY absente. Configure-la dans les variables d'environnement Hostinger, puis redémarre l'app Node.");
  }
  const r = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Quentin Duquenne <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
      reply_to: 'contact@quentinduquenne.fr',
      tags: [{ name: 'project', value: 'ppi-quentin-duquenne' }],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || `Resend a répondu ${r.status}`);
  return data;
}

app.post('/api/send-dossier', async (req, res) => {
  try {
    const email = (req.body && req.body.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const html = buildDossierEmailHtml({
      toEmail: email,
      ppiLink: `${origin}/`,
      cvFrLink: `${origin}/assets/cv/CV-Quentin-Duquenne-FR.pdf`,
      cvEnLink: `${origin}/assets/cv/CV-Quentin-Duquenne-EN.pdf`,
      portfolioLink: `${origin}/assets/portfolio/DQN-Design-Identites-Visuelles-2020-2022.pdf`,
      dossierPdfLink: `${origin}/assets/dossier/PPI-Quentin-Duquenne-JUMP-M2.pdf`,
    });

    const result = await sendViaResend({
      to: email,
      subject: 'Ton dossier PPI — Quentin Duquenne',
      html,
    });

    return res.json({ ok: true, id: result.id });
  } catch (err) {
    console.error('[/api/send-dossier]', err.message);
    return res.status(500).json({ error: err.message || "Erreur d'envoi." });
  }
});

app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PPI Quentin Duquenne running on port ${PORT}`);
});
