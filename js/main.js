document.addEventListener('DOMContentLoaded', () => {
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
