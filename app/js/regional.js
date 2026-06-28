import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import {
  COMPASS_ANGLE,
  DPT_TO_REG,
  FLOWER_ORDER,
  FLOWER_REGIONS,
  buildChoroplethLookup,
  compassRegionLines,
  flowerZone,
  fmtNum,
  debounce,
  decadeSliderHtml,
  bindDecadeSlider,
  CHART_THEME,
  RATE_METRIC,
} from './constants.js';
import { getMapRows } from './data.js';

/** Shared visual tokens — aligned with app CSS. */
const THEME = CHART_THEME;

const LAYOUT = {
  titleY: 22,
  subtitleY: 40,
  chartTop: 52,
  footerY: -14,
  legendH: 8,
  legendW: 128,
};

/** Math bearing (East=0, CCW, π/2=North) → SVG coordinates (y down). */
function compassXY(r, angle) {
  return [r * Math.cos(angle), -r * Math.sin(angle)];
}

/** Rotate label text along the ray; flip when it would read upside-down. */
function compassLabelLayout(angle) {
  const dx = Math.cos(angle);
  const dy = -Math.sin(angle);
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  let outward = 1;
  if (deg > 90 || deg < -90) {
    deg += 180;
    outward = -1;
  }
  return {
    deg,
    anchor: outward > 0 ? 'start' : 'end',
    outward,
  };
}

function panelSize(parent, minHeight = 600) {
  const width = parent.clientWidth || 480;
  const height = Math.max(minHeight, width * 0.92);
  return { width, height };
}

function appendPanelHeader(svg, width, title, subtitle) {
  svg
    .append('text')
    .attr('x', 20)
    .attr('y', LAYOUT.titleY)
    .attr('class', 'regional-panel-title')
    .text(title);

  svg
    .append('text')
    .attr('x', 20)
    .attr('y', LAYOUT.subtitleY)
    .attr('class', 'regional-panel-subtitle')
    .text(subtitle);
}

function appendRateLegend(svg, width, height, color, maxRate, uid) {
  const lx = width - LAYOUT.legendW - 20;
  const ly = height + LAYOUT.footerY - LAYOUT.legendH;

  const defs = svg.append('defs');
  const grad = defs
    .append('linearGradient')
    .attr('id', `reg-grad-${uid}`)
    .attr('x1', '0%')
    .attr('x2', '100%');
  grad.append('stop').attr('offset', '0%').attr('stop-color', color(0));
  grad.append('stop').attr('offset', '100%').attr('stop-color', color(maxRate));

  svg
    .append('rect')
    .attr('x', lx)
    .attr('y', ly)
    .attr('width', LAYOUT.legendW)
    .attr('height', LAYOUT.legendH)
    .attr('rx', 2)
    .attr('fill', `url(#reg-grad-${uid})`)
    .attr('stroke', THEME.border);

  svg
    .append('text')
    .attr('x', lx)
    .attr('y', ly - 5)
    .attr('class', 'regional-legend-label')
    .text(RATE_METRIC.label);

  svg
    .append('text')
    .attr('x', lx + LAYOUT.legendW)
    .attr('y', ly + LAYOUT.legendH - 1)
    .attr('text-anchor', 'end')
    .attr('class', 'regional-legend-max')
    .text(maxRate >= 10 ? maxRate.toFixed(0) : maxRate.toFixed(1));
}

function computeFlowerData(mapRows) {
  const byFlower = new Map(FLOWER_ORDER.map((f) => [f, { flower: f, nombre: 0, weighted: 0, weight: 0 }]));

  mapRows.forEach((r) => {
    const flower = flowerZone(r.dpt, r.region ?? DPT_TO_REG[r.dpt]);
    if (!flower) return;
    const entry = byFlower.get(flower);
    const w = Math.max(r.nombre, 1);
    entry.nombre += r.nombre;
    entry.weighted += r.rate_per_10k * w;
    entry.weight += w;
  });

  return FLOWER_ORDER.map((f) => {
    const e = byFlower.get(f);
    return {
      flower: f,
      rate_per_10k: e.weight > 0 ? e.weighted / e.weight : 0,
    };
  });
}

function renderChoropleth(parent, geo, mapRows, tooltipEl, uid) {
  parent.innerHTML = '';
  const { width, height } = panelSize(parent);
  const lookup = buildChoroplethLookup(mapRows);

  const svg = d3
    .select(parent)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'regional-svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  appendPanelHeader(svg, width, 'Department map', RATE_METRIC.mapSubtitle);

  const maxRate = d3.max(mapRows, (d) => d.rate_per_10k) || 1;
  const validRates = mapRows.map((d) => d.rate_per_10k).filter((v) => v > 0).sort(d3.ascending);
  const color = validRates.length > 1
    ? d3.scaleSequentialQuantile(validRates, d3.interpolateRgb(CHART_THEME.seqLow, CHART_THEME.seqHigh))
    : d3.scaleSequential().domain([0, Math.max(maxRate, 0.01)]).interpolator(d3.interpolateRgb(CHART_THEME.seqLow, CHART_THEME.seqHigh));

  const projection = d3.geoMercator().fitExtent(
    [[20, LAYOUT.chartTop + 4], [width - 20, height + LAYOUT.footerY - 20]],
    { type: 'FeatureCollection', features: geo.features },
  );
  const path = d3.geoPath(projection);

  const showTip = (event, feature) => {
    const code = feature.properties.code;
    const row = lookup.get(code);
    const rate = row?.rate_per_10k ?? 0;
    tooltipEl.classList.remove('hidden');
    const corseNote = row?.dpt === '20' && (code === '2A' || code === '2B')
      ? '<br/><span class="regional-tooltip-note">Whole-island aggregate (INSEE 20)</span>'
      : '';
    const rateDisplay = rate === 0 ? '0' : rate < 0.1 ? rate.toFixed(2) : rate.toFixed(1);
    tooltipEl.innerHTML = `
      <strong>${feature.properties.nom}</strong>
      ${row
        ? `Births (name): ${fmtNum(row.nombre)}<br/>Dept. births (all): ${fmtNum(row.total_births)}<br/>${RATE_METRIC.label}: ${rateDisplay}${corseNote}`
        : 'No births'}
    `;
    const rect = parent.closest('.chart-wrap')?.getBoundingClientRect() ?? parent.getBoundingClientRect();
    tooltipEl.style.left = `${event.clientX - rect.left + 10}px`;
    tooltipEl.style.top = `${event.clientY - rect.top + 10}px`;
  };

  svg
    .append('g')
    .attr('class', 'regional-map-layer')
    .selectAll('path')
    .data(geo.features)
    .join('path')
    .attr('d', path)
    .attr('fill', (f) => {
      const row = lookup.get(f.properties.code);
      return row ? color(row.rate_per_10k) : THEME.noData;
    })
    .attr('stroke', THEME.border)
    .attr('stroke-width', 0.6)
    .on('mousemove', showTip)
    .on('mouseleave', () => tooltipEl.classList.add('hidden'));

  appendRateLegend(svg, width, height, color, maxRate, `map-${uid}`);
}

function renderCompass(parent, flowerData, name, decade, tooltipEl, uid) {
  parent.innerHTML = '';
  const { width, height } = panelSize(parent);

  const padTop = LAYOUT.chartTop + 6;
  const padBottom = height + LAYOUT.footerY - 6;
  const padSide = 16;
  const innerW = width - 2 * padSide;
  const innerH = padBottom - padTop;
  const cx = width / 2;
  const cy = padTop + innerH / 2;

  const svg = d3
    .select(parent)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'regional-svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  appendPanelHeader(svg, width, 'Regional compass', RATE_METRIC.compassSubtitle);

  const maxRate = Math.max(d3.max(flowerData, (d) => d.rate_per_10k), 0.1);
  const compassRates = flowerData.map((d) => d.rate_per_10k).filter((v) => v > 0).sort(d3.ascending);
  const color = compassRates.length > 1
    ? d3.scaleSequentialQuantile(compassRates, d3.interpolateRgb(CHART_THEME.seqLow, CHART_THEME.seqHigh))
    : d3.scaleSequential().domain([0, maxRate]).interpolator(d3.interpolateRgb(CHART_THEME.seqLow, CHART_THEME.seqHigh));

  const regionLabelPad = 30;
  const maxR = Math.min(innerW, innerH) / 2 - regionLabelPad * 0.45;
  const r0 = maxR * 0.24;
  const rayExtent = Math.max(maxR - r0 - regionLabelPad, maxR * 0.35);
  const rayScale = rayExtent / maxRate;
  const rayWidth = Math.max(10, maxR * 0.055);

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  g.append('circle')
    .attr('r', r0)
    .attr('fill', 'none')
    .attr('stroke', THEME.border)
    .attr('stroke-width', 1.5);

  const sorted = [...flowerData].sort((a, b) => b.rate_per_10k - a.rate_per_10k);

  sorted.forEach((d) => {
    const angle = COMPASS_ANGLE[d.flower];
    const [x1, y1] = compassXY(r0, angle);
    const rEnd = r0 + d.rate_per_10k * rayScale;
    const [x2, y2] = compassXY(rEnd, angle);
    const regionLines = compassRegionLines(d.flower);
    const regionTitle = FLOWER_REGIONS[d.flower] ?? d.flower;
    const { deg, anchor, outward } = compassLabelLayout(angle);
    const lineHeight = 11;
    const labelGap = 6;
    const longestLine = regionLines.reduce((a, b) => (a.length > b.length ? a : b), '');
    const labelExtent = labelGap + longestLine.length * 2.4 + 4;
    const labelR = Math.min(rEnd + labelExtent, maxR - 3);
    const [lx, ly] = compassXY(labelR, angle);
    const rateStr = d.rate_per_10k.toFixed(1);

    g.append('line')
      .attr('class', 'compass-ray')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', color(d.rate_per_10k))
      .attr('stroke-width', rayWidth)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.92)
      .style('cursor', 'pointer')
      .on('mousemove', (event) => {
        tooltipEl.classList.remove('hidden');
        tooltipEl.innerHTML = `
          <strong>${regionTitle}</strong>
          ${RATE_METRIC.label}: ${rateStr}<br/>
          ${name} · ${decade}s
        `;
        const rect = parent.closest('.chart-wrap')?.getBoundingClientRect() ?? parent.getBoundingClientRect();
        tooltipEl.style.left = `${event.clientX - rect.left + 10}px`;
        tooltipEl.style.top = `${event.clientY - rect.top + 10}px`;
      })
      .on('mouseleave', () => tooltipEl.classList.add('hidden'));

    g.append('circle')
      .attr('cx', x2)
      .attr('cy', y2)
      .attr('r', 6)
      .attr('fill', color(d.rate_per_10k))
      .attr('stroke', THEME.ink)
      .attr('stroke-width', 1.5)
      .style('pointer-events', 'none');

    const labelG = g
      .append('g')
      .attr('class', 'regional-compass-label-group')
      .attr('transform', `translate(${lx},${ly}) rotate(${deg})`);

    regionLines.forEach((line, i) => {
      const y = regionLines.length === 1 ? 0 : (i - (regionLines.length - 1) / 2) * lineHeight;
      labelG
        .append('text')
        .attr('text-anchor', anchor)
        .attr('x', outward * labelGap)
        .attr('y', y)
        .attr('dominant-baseline', 'middle')
        .attr('class', 'regional-compass-label')
        .attr('stroke', '#fff')
        .attr('stroke-width', 3)
        .attr('paint-order', 'stroke fill')
        .text(line);
    });
  });

  g.append('circle')
    .attr('r', r0 * 0.66)
    .attr('fill', '#fff')
    .attr('stroke', THEME.ink)
    .attr('stroke-width', 1.5);

  g.append('text')
    .attr('text-anchor', 'middle')
    .attr('y', -6)
    .attr('class', 'regional-compass-center-name')
    .text(name.length > 12 ? `${name.slice(0, 11)}…` : name);

  g.append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 10)
    .attr('class', 'regional-compass-center-decade')
    .text(`${decade}s`);

  appendRateLegend(svg, width, height, color, maxRate, `compass-${uid}`);
}

export function initRegional(container, controlsEl, tooltipEl, mapIndex, geo, top20Map, decadesMap) {
  const state = {
    name: top20Map.includes('MARIE') ? 'MARIE' : top20Map[0],
    decade: decadesMap.includes(2010) ? 2010 : decadesMap[decadesMap.length - 1],
  };
  let renderUid = 0;

  controlsEl.innerHTML = `
    <div class="control-group">
      <label for="reg-name">Name</label>
      <select id="reg-name">${top20Map.map((n) => `<option value="${n}"${n === state.name ? ' selected' : ''}>${n}</option>`).join('')}</select>
    </div>
    ${decadeSliderHtml('reg-decade', 'Decade', decadesMap, state.decade)}
  `;

  controlsEl.querySelector('#reg-name').addEventListener('change', (e) => {
    state.name = e.target.value;
    render();
  });
  bindDecadeSlider(controlsEl, 'reg-decade', {
    onInput: (decade) => {
      state.decade = decade;
    },
    onChange: () => {
      render();
    },
  });

  function render() {
    renderUid += 1;
    const uid = renderUid;
    const mapRows = getMapRows(mapIndex, state.name, state.decade);
    const flowerData = computeFlowerData(mapRows);

    container.innerHTML = `
      <div class="regional-split">
        <div class="regional-panel regional-panel--map"></div>
        <div class="regional-panel regional-panel--compass"></div>
      </div>
    `;

    const mapEl = container.querySelector('.regional-panel--map');
    const compassEl = container.querySelector('.regional-panel--compass');

    renderChoropleth(mapEl, geo, mapRows, tooltipEl, uid);
    renderCompass(compassEl, flowerData, state.name, state.decade, tooltipEl, uid);
  }

  render();
  window.addEventListener('resize', debounce(render, 250));
}
