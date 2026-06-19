/** Shared constants — mirrors baby_names_3_implementation.ipynb */

export const REGION_MAP = {
  'Île-de-France': ['75', '77', '78', '91', '92', '93', '94', '95'],
  Bretagne: ['22', '29', '35', '56'],
  PACA: ['04', '05', '06', '13', '83', '84'],
  'Auvergne-RA': ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
  Occitanie: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
  'Nouvelle-Aquit.': ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
  'Grand-Est': ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
  Normandie: ['14', '27', '50', '61', '76'],
  'Hauts-de-France': ['02', '59', '60', '62', '80'],
  'Pays-de-la-Loire': ['44', '49', '53', '72', '85'],
  'Centre-Val de Loire': ['18', '28', '36', '37', '41', '45'],
  'Bourgogne-Franche-Comté': ['21', '25', '39', '58', '70', '71', '89', '90'],
};

export const DPT_TO_REG = Object.fromEntries(
  Object.entries(REGION_MAP).flatMap(([reg, dpts]) => dpts.map((d) => [d, reg])),
);

export const REGION_TO_FLOWER = {
  'Hauts-de-France': 'Nord',
  Normandie: 'Nord',
  Bretagne: 'Ouest',
  'Pays-de-la-Loire': 'Ouest',
  'Île-de-France': 'IDF',
  'Grand-Est': 'Est',
  'Nouvelle-Aquit.': 'S-O',
  Occitanie: 'S-O',
  PACA: 'S-E',
  'Auvergne-RA': 'Sud',
  'Centre-Val de Loire': 'Centre',
  'Bourgogne-Franche-Comté': 'Est',
};

export const CORSE_DPT = new Set(['2A', '2B', '20']);
/** INSEE CSV codes → modern GeoJSON department codes (same row duplicated per target). */
export const DPT_GEO_ALIASES = {
  20: ['2A', '2B'],
};
export const FLOWER_ORDER = ['Nord', 'Ouest', 'IDF', 'Est', 'Centre', 'S-O', 'S-E', 'Corse', 'Sud'];

/** Shared chart tokens — aligned with app CSS variables. */
export const CHART_THEME = {
  ink: '#101828',
  inkSecondary: '#344054',
  muted: '#667085',
  border: '#e4e7ec',
  noData: '#eef2f6',
  seqLow: '#eef4ff',
  seqMid: '#8098f9',
  seqHigh: '#3538cd',
  accent: '#444ce7',
  balance: '#12b76a',
  streamStroke: '#ffffff',
  badgeFill: '#101828',
  badgeText: '#ffffff',
};

/** Categorical palette for ranked streams & trajectories. */
export const CHART_CATEGORICAL = [
  '#444ce7', '#7a5af8', '#2e90fa', '#06aed4', '#12b76a',
  '#66c61c', '#fac515', '#ef6820', '#f04438', '#ee46bc',
  '#9e77ed', '#667085',
];

/** Area bump streams (chart 1) — moderate saturation. */
export const CHART_CATEGORICAL_BUMP = [
  '#6979d4', '#9078d4', '#5a9fd4', '#5aadbd', '#6bb592',
  '#8fb86a', '#d4b85a', '#d4955a', '#d47373', '#d46a9a',
  '#a07bd4', '#788095', '#5c6bc0', '#7e57c2', '#42a5f5',
  '#26a69a', '#66bb6a', '#ffca28', '#ff8a65', '#ab47bc',
];

/** Extended set for 5×5 gender trajectories. */
export const CHART_CATEGORICAL_25 = [
  ...CHART_CATEGORICAL,
  '#528bff', '#9b8afb', '#53b1fd', '#22ccee', '#3bcc84',
  '#85e13a', '#fde272', '#ff692e', '#ff5733', '#fd53c0',
  '#b692f6', '#98a2b3', '#475467',
].slice(0, 25);

/** Five band tints: mostly-male → balanced → mostly-female. */
export const CHART_BAND = ['#444ce7', '#8098f9', '#d0d5dd', '#fda4af', '#f63d68'];

/** Regional map & compass — unified rate metric labelling. */
export const RATE_METRIC = {
  label: 'Rate / 10k',
  mapSubtitle: 'Choropleth · rate / 10k',
  compassSubtitle: 'Macro-regions · ray length = rate / 10k',
};

/** French macro-region names — two lines max on the compass (keys match FLOWER_ORDER). */
export const FLOWER_REGION_LINES = {
  Nord: ['Hauts-de-France', 'Normandie'],
  Ouest: ['Bretagne', 'Pays de la Loire'],
  IDF: ['Île-de-France'],
  Est: ['Grand Est', 'Bourgogne-Franche-Comté'],
  Centre: ['Centre-Val', 'de Loire'],
  'S-O': ['Nouvelle-Aquitaine', 'Occitanie'],
  'S-E': ['Provence-Alpes-Côte', "d'Azur"],
  Corse: ['Corse'],
  Sud: ['Auvergne-Rhône', 'Alpes'],
};

/** Full region title (tooltips) — derived from compass lines. */
export const FLOWER_REGIONS = Object.fromEntries(
  Object.entries(FLOWER_REGION_LINES).map(([flower, lines]) => [flower, lines.join(' · ')]),
);

/** Lines to render on a compass petal label. */
export function compassRegionLines(flower) {
  return FLOWER_REGION_LINES[flower] ?? [flower];
}

/** Radians from East, CCW (π/2 = North) */
export const COMPASS_ANGLE = {
  Nord: Math.PI / 2,
  Ouest: Math.PI,
  IDF: Math.PI / 2 - Math.PI / 8,
  Est: 0,
  Centre: -Math.PI / 3,
  'S-O': (-3 * Math.PI) / 4,
  'S-E': -Math.PI / 4,
  Corse: -Math.PI / 6,
  Sud: -Math.PI / 2,
};

export const LEAF_PATH = 'M0,-7 C3,-4 5,1 0,8 C-5,1 -3,-4 0,-7 Z';

export const BOY_COLOR = '#444ce7';
export const GIRL_COLOR = '#f63d68';
export const BOY_TEXT = '#3538cd';
export const GIRL_TEXT = '#e31b54';

export const GRID_ROWS = 5;
export const GRID_COLS = 5;
export const MIN_BIRTHS_DECADE = 50;

export function leafAngle(name, decade) {
  let h = 0;
  const key = `${name}|${decade}`;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (h % 110) - 55;
}

export function flowerZone(dpt, region) {
  if (CORSE_DPT.has(dpt)) return 'Corse';
  return REGION_TO_FLOWER[region] ?? null;
}

/** Map CSV department rows onto GeoJSON feature codes (handles Corsica 20 → 2A/2B). */
export function buildChoroplethLookup(mapRows) {
  const lookup = new Map();
  mapRows.forEach((row) => {
    lookup.set(row.dpt, row);
    (DPT_GEO_ALIASES[row.dpt] ?? []).forEach((code) => lookup.set(code, row));
  });
  return lookup;
}

export function fmtNum(n) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

export function fmtPct(n, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtRatioBand(lo, hi) {
  if (lo === hi) return fmtPct(lo);
  return `${fmtPct(lo)}–${fmtPct(hi)}`;
}

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** HTML for a decade range slider (step 10). */
export function decadeSliderHtml(id, label, decades, value, outputId = `${id}-label`) {
  if (!decades.length) return '';
  const min = decades[0];
  const max = decades[decades.length - 1];
  return `
    <div class="control-group control-group--slider">
      <label for="${id}">${label}</label>
      <div class="decade-slider">
        <input
          id="${id}"
          type="range"
          min="${min}"
          max="${max}"
          step="10"
          value="${value}"
          list="${id}-ticks"
        />
        <datalist id="${id}-ticks">
          ${decades.map((d) => `<option value="${d}" label="${d}"></option>`).join('')}
        </datalist>
        <output id="${outputId}" for="${id}">${value}s</output>
      </div>
    </div>
  `;
}

/** Wire decade slider input/change handlers. */
export function bindDecadeSlider(controlsEl, id, { onInput, onChange, outputId = `${id}-label` } = {}) {
  const slider = controlsEl.querySelector(`#${id}`);
  const output = controlsEl.querySelector(`#${outputId}`);
  if (!slider) return;

  slider.addEventListener('input', () => {
    const decade = Number(slider.value);
    if (output) output.textContent = `${decade}s`;
    onInput?.(decade);
  });
  slider.addEventListener('change', () => {
    onChange?.(Number(slider.value));
  });
}
