/* ============================================
   ENVOI AUTOMATIQUE DU DOSSIER PAR EMAIL — via EmailJS (100% front-end, sans backend)
   Pour activer l'envoi réellement automatique :
   1. Crée un compte gratuit sur https://www.emailjs.com
   2. Connecte ta boîte mail (Gmail, Outlook...) comme "Email Service" -> récupère le SERVICE_ID
   3. Crée un "Email Template" en collant le contenu de email-template.html (à la racine du repo)
      dans l'éditeur "Code" du template EmailJS. Le champ "To email" du template doit être
      {{to_email}}. Les variables {{ppi_link}}, {{cv_fr_link}}, {{cv_en_link}} et
      {{portfolio_link}} sont injectées automatiquement par le code ci-dessous (URLs absolues
      calculées à partir du domaine réel une fois le site déployé) -> récupère le TEMPLATE_ID
   4. Récupère ta "Public Key" dans Account > General
   5. Remplace les 3 valeurs ci-dessous. Tant qu'elles ne sont pas renseignées, chaque formulaire
      bascule automatiquement sur un mailto: pré-rempli (aucune configuration requise).
   ============================================ */
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_READY = ![EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID].some(v => v.startsWith('YOUR_'));

if (EMAILJS_READY && window.emailjs) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

function wireEmailForm(formId, inputId, statusId) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById(inputId);
    const email = input.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      status.textContent = 'Merci de renseigner une adresse email valide.';
      status.className = 'email-capture__status is-err';
      return;
    }
    const submitBtn = form.querySelector('button');
    const originalLabel = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
    const templateParams = {
      to_email: email,
      ppi_link: window.location.origin + window.location.pathname,
      cv_fr_link: base + 'assets/cv/CV-Quentin-Duquenne-FR.pdf',
      cv_en_link: base + 'assets/cv/CV-Quentin-Duquenne-EN.pdf',
      portfolio_link: base + 'assets/portfolio/DQN-Design-Identites-Visuelles-2020-2022.pdf',
    };

    if (EMAILJS_READY && window.emailjs) {
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(() => {
          status.textContent = 'C\'est envoyé ! Vérifie ta boîte mail (et les spams).';
          status.className = 'email-capture__status is-ok';
          form.reset();
        })
        .catch(() => {
          status.textContent = 'Erreur d\'envoi — réessaie ou écris à contact@quentinduquenne.fr.';
          status.className = 'email-capture__status is-err';
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalLabel;
        });
    } else {
      // Repli sans configuration EmailJS : ouvre un email pré-rempli vers Quentin
      const subject = encodeURIComponent('Demande du dossier PPI complet');
      const body = encodeURIComponent(`Bonjour Quentin,\n\nPourriez-vous m'envoyer le dossier PPI complet (CV + portfolio) ?\nMon email : ${email}\n\nMerci !`);
      window.location.href = `mailto:contact@quentinduquenne.fr?subject=${subject}&body=${body}`;
      status.textContent = 'Configuration email en attente — ton client mail va s\'ouvrir pour envoyer la demande directement.';
      status.className = 'email-capture__status is-ok';
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // ---- Formulaires "Recevoir le PDF par email" (Annexes + CTA final) ----
  wireEmailForm('pdfEmailForm', 'pdfEmailInput', 'pdfEmailStatus');
  wireEmailForm('pdfEmailFormMain', 'pdfEmailInputMain', 'pdfEmailStatusMain');

  // ---- Sidebar mobile toggle ----
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  function closeSidebar() { sidebar.classList.remove('is-open'); overlay.classList.remove('is-open'); }
  function openSidebar() { sidebar.classList.add('is-open'); overlay.classList.add('is-open'); }
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });
  if (overlay) overlay.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', closeSidebar));

  // ---- Reveal on scroll ----
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal, .trait-bar').forEach(el => io.observe(el));

  // ---- MBTI scales fill ----
  document.querySelectorAll('.mbti-scale').forEach(scale => {
    const pct = parseFloat(scale.dataset.pct);
    const fill = scale.querySelector('.mbti-scale__fill');
    const dot = scale.querySelector('.mbti-scale__dot');
    if (fill) fill.style.width = pct + '%';
    if (dot) dot.style.left = pct + '%';
  });

  // ---- Job card accordions ----
  document.querySelectorAll('.job-card__head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.job-card').classList.toggle('is-open');
    });
  });

  // ---- Sidebar scroll-spy (sections + sub-anchors) ----
  const topItems = Array.from(sidebar.querySelectorAll('.sidebar__nav > ul > li'));
  const sectionEls = topItems.map(li => document.getElementById(li.dataset.section)).filter(Boolean);

  const subLinks = Array.from(sidebar.querySelectorAll('.sidebar__nav ul.sub a'));
  const subTargets = subLinks.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);

  function setActiveTop(id) {
    topItems.forEach(li => li.classList.toggle('is-active', li.dataset.section === id));
  }
  function setActiveSub(id) {
    subLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + id));
  }

  const sectionSpy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActiveTop(entry.target.id);
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  sectionEls.forEach(el => sectionSpy.observe(el));

  const subSpy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActiveSub(entry.target.id);
    });
  }, { rootMargin: '-20% 0px -65% 0px' });
  subTargets.forEach(el => subSpy.observe(el));

  if (sectionEls[0]) setActiveTop(sectionEls[0].id);

  // ---- Radar chart (SVG) ----
  const radarEl = document.getElementById('competencyRadar');
  if (radarEl) {
    const data = [
      { label: 'Innovation', value: 9 },
      { label: 'Recrutement', value: 8 },
      { label: 'Gestion de groupe', value: 7 },
      { label: 'Administratif', value: 6 },
      { label: 'Digital', value: 9 },
      { label: 'Communication', value: 8 },
    ];
    radarEl.innerHTML = buildRadarSVG(data, 10);
  }

  function buildRadarSVG(data, max) {
    const size = 420, center = size / 2, radius = size / 2 - 60;
    const n = data.length;
    const angleFor = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
    const pointFor = (i, v) => {
      const r = (v / max) * radius;
      const a = angleFor(i);
      return [center + r * Math.cos(a), center + r * Math.sin(a)];
    };
    let rings = '';
    [2, 4, 6, 8, 10].forEach(step => {
      const pts = data.map((_, i) => pointFor(i, step).join(',')).join(' ');
      rings += `<polygon points="${pts}" fill="none" stroke="rgba(10,10,10,0.08)" stroke-width="1" />`;
    });
    const axes = data.map((_, i) => {
      const [x, y] = pointFor(i, max);
      return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="rgba(10,10,10,0.08)" stroke-width="1" />`;
    }).join('');
    const shapePts = data.map((d, i) => pointFor(i, d.value).join(',')).join(' ');
    const dots = data.map((d, i) => {
      const [x, y] = pointFor(i, d.value);
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#7747ff" />`;
    }).join('');
    const labels = data.map((d, i) => {
      const [x, y] = pointFor(i, max + 2.2);
      const anchor = Math.abs(x - center) < 10 ? 'middle' : (x > center ? 'start' : 'end');
      return `<text x="${x}" y="${y}" font-size="13" text-anchor="${anchor}" dominant-baseline="middle">${d.label}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" style="max-width:420px">
      ${rings}${axes}
      <polygon points="${shapePts}" fill="rgba(119,71,255,0.18)" stroke="#7747ff" stroke-width="2.5" />
      ${dots}${labels}
    </svg>`;
  }
});
