/* ============================================
   ENVOI AUTOMATIQUE DU DOSSIER PAR EMAIL — via Resend (backend server.js)
   Le formulaire poste vers /api/send-dossier (voir server.js), qui appelle
   l'API Resend côté serveur — même architecture que sur rokudan-saas.
   Pour que l'envoi fonctionne réellement en prod (Hostinger Node) :
   1. Compte gratuit sur https://resend.com
   2. Resend > API Keys > Create API Key -> copie la clé "re_xxx"
   3. Hostinger > Node.js > Variables d'environnement, ajoute :
        RESEND_API_KEY = re_xxx
        RESEND_FROM_EMAIL = Quentin Duquenne <onboarding@resend.dev>
      (onboarding@resend.dev fonctionne sans configuration DNS, mais ne peut
      envoyer que vers l'email du compte Resend — pour envoyer à n'importe
      quel visiteur, vérifie ton propre domaine dans Resend > Domains, puis
      utilise RESEND_FROM_EMAIL = Quentin Duquenne <contact@quentinduquenne.fr>)
   4. Redémarre l'app Node dans Hostinger
   Tant que RESEND_API_KEY n'est pas configurée (ou si le site tourne en
   statique pur, sans serveur Node), le formulaire bascule automatiquement
   sur un mailto: pré-rempli.
   ============================================ */
function wireEmailForm(formId, inputId, statusId) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
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

    function fallbackMailto(message) {
      const subject = encodeURIComponent('Demande du dossier PPI complet');
      const body = encodeURIComponent(`Bonjour Quentin,\n\nPourriez-vous m'envoyer le dossier PPI complet (CV + portfolio) ?\nMon email : ${email}\n\nMerci !`);
      window.location.href = `mailto:contact@quentinduquenne.fr?subject=${subject}&body=${body}`;
      status.textContent = message;
      status.className = 'email-capture__status is-ok';
    }

    try {
      const res = await fetch('/api/send-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        status.textContent = 'C\'est envoyé ! Vérifie ta boîte mail (et les spams).';
        status.className = 'email-capture__status is-ok';
        form.reset();
      } else if (res.status === 404) {
        // Pas de backend disponible (site servi en statique pur)
        fallbackMailto('Envoi automatique indisponible ici — ton client mail va s\'ouvrir pour envoyer la demande directement.');
      } else {
        status.textContent = (data && data.error) || 'Erreur d\'envoi — réessaie ou écris à contact@quentinduquenne.fr.';
        status.className = 'email-capture__status is-err';
      }
    } catch (err) {
      fallbackMailto('Envoi automatique indisponible — ton client mail va s\'ouvrir pour envoyer la demande directement.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // ---- Formulaires "Recevoir le PDF par email" (Annexes + CTA final) ----
  wireEmailForm('pdfEmailForm', 'pdfEmailInput', 'pdfEmailStatus');
  wireEmailForm('pdfEmailFormMain', 'pdfEmailInputMain', 'pdfEmailStatusMain');

  // ---- Timeline horizontale : retire le fondu de droite une fois arrivé au bout ----
  const timelineH = document.querySelector('.timeline-h');
  if (timelineH) {
    const updateFade = () => {
      const atEnd = timelineH.scrollLeft + timelineH.clientWidth >= timelineH.scrollWidth - 4;
      timelineH.classList.toggle('is-at-end', atEnd);
    };
    timelineH.addEventListener('scroll', updateFade, { passive: true });
    updateFade();
    window.addEventListener('resize', updateFade);
  }

  // ---- Carrousel "Mon parcours" : flèches, compteur, fondu de fin ----
  const parcoursCarousel = document.getElementById('parcoursCarousel');
  if (parcoursCarousel) {
    const slides = Array.from(parcoursCarousel.querySelectorAll('.parcours-slide'));
    const prevBtn = document.getElementById('parcoursPrev');
    const nextBtn = document.getElementById('parcoursNext');
    const counter = document.getElementById('parcoursCounter');
    const total = slides.length;

    let activeIndex = 0;

    const closestIndex = () => {
      let closest = 0;
      let closestDist = Infinity;
      slides.forEach((slide, i) => {
        const dist = Math.abs(slide.offsetLeft - parcoursCarousel.scrollLeft);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      return closest;
    };

    const render = (idx, atEnd) => {
      if (counter) counter.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = atEnd;
    };

    const updateCarousel = () => {
      const atEnd = parcoursCarousel.scrollLeft + parcoursCarousel.clientWidth >= parcoursCarousel.scrollWidth - 4;
      parcoursCarousel.classList.toggle('is-at-end', atEnd);
      activeIndex = atEnd ? total - 1 : closestIndex();
      render(activeIndex, atEnd);
    };

    const scrollToIndex = (idx) => {
      activeIndex = Math.max(0, Math.min(total - 1, idx));
      slides[activeIndex].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      render(activeIndex, activeIndex === total - 1);
    };

    if (prevBtn) prevBtn.addEventListener('click', () => scrollToIndex(activeIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollToIndex(activeIndex + 1));
    parcoursCarousel.addEventListener('scroll', updateCarousel, { passive: true });
    window.addEventListener('resize', updateCarousel);
    updateCarousel();

    // Liens du sommaire (sidebar) pointant vers une étape du carrousel :
    // le scroll natif de l'ancre ne défile pas le carrousel horizontal, on le fait à la main.
    document.querySelectorAll('a[href^="#p-"]').forEach(a => {
      const idx = slides.findIndex(slide => '#' + slide.id === a.getAttribute('href'));
      if (idx === -1) return;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('parcours').scrollIntoView({ behavior: 'smooth', block: 'start' });
        scrollToIndex(idx);
      });
    });
  }

  // ---- Déconnexion ----
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await fetch('/api/logout', { method: 'POST' }); } catch (e) {}
      window.location.href = '/login.html';
    });
  }

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
