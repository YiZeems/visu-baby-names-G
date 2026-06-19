import { loadAppData } from './data.js';
import { initStreamgraph } from './streamgraph.js';
import { initRegional } from './regional.js';
import { initGenderTrajectory } from './gender.js';

function renderStats(meta) {
  const el = document.getElementById('dataset-stats');
  el.innerHTML = `
    <div><dt>Names</dt><dd>${meta.nameCount.toLocaleString('en-US')}</dd></div>
    <div><dt>Period</dt><dd>${meta.yearMin}–${meta.yearMax}</dd></div>
    <div><dt>Decades</dt><dd>${meta.decades.length}</dd></div>
  `;
}

function initSectionNav() {
  const links = [...document.querySelectorAll('.section-nav a[data-section]')];
  const sections = links
    .map((link) => document.getElementById(link.dataset.section))
    .filter(Boolean);

  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach((link) => {
      link.classList.toggle('is-active', link.dataset.section === id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) setActive(visible[0].target.id);
    },
    { rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.25, 0.5] },
  );

  sections.forEach((section) => observer.observe(section));
  setActive(sections[0].id);
}

function syncHeaderHeight() {
  const navWrap = document.querySelector('.section-nav-wrap');
  if (navWrap) {
    document.documentElement.style.setProperty('--header-h', `${navWrap.offsetHeight}px`);
  }
}

async function main() {
  const loading = document.getElementById('loading');
  const content = document.getElementById('app-content');
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);

  try {
    const data = await loadAppData();
    renderStats(data.meta);

    initStreamgraph(
      document.getElementById('stream-chart'),
      document.getElementById('stream-controls'),
      document.getElementById('stream-tooltip'),
      data.genderRaw,
      data.decades,
    );

    initRegional(
      document.getElementById('regional-chart'),
      document.getElementById('regional-controls'),
      document.getElementById('regional-tooltip'),
      data.mapIndex,
      data.geo,
      data.top20Map,
      data.decadesMap,
    );

    initGenderTrajectory(
      document.getElementById('gender-chart'),
      document.getElementById('gender-controls'),
      document.getElementById('gender-tooltip'),
      data.genderRaw,
      data.decades,
    );

    loading.classList.add('hidden');
    content.classList.remove('hidden');
    initSectionNav();
    syncHeaderHeight();
  } catch (err) {
    loading.innerHTML = `
      <div class="error-panel" role="alert">
        <strong>Loading error</strong>
        <p>${err.message}</p>
        <p style="margin-top:0.75rem">
          Run the app from <code>app/</code> with <code>npm run dev</code>.
          CSV and GeoJSON files must be in <code>public/data/</code>.
        </p>
      </div>
    `;
    console.error(err);
  }
}

main();
