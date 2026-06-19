import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fmtNum, debounce, decadeSliderHtml, bindDecadeSlider, CHART_CATEGORICAL_BUMP, CHART_THEME } from './constants.js';
import { natDecRows } from './data.js';

const BUMP_N = 20;

/** Pick name vs rank label from available band / column space. */
function bumpStreamLabel(name, bandHPx, decadeStepPx) {
  if (bandHPx < 11) return { type: 'none' };

  const fontSize = Math.min(9, Math.max(7, bandHPx - 4));
  let maxChars = 0;
  if (decadeStepPx >= 72) maxChars = 14;
  else if (decadeStepPx >= 54) maxChars = 10;
  else if (decadeStepPx >= 42) maxChars = 7;

  if (maxChars > 0 && bandHPx >= 13) {
    const text = name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;
    return { type: 'name', text, fontSize };
  }

  if (bandHPx >= 10) return { type: 'rank' };
  return { type: 'none' };
}

function buildBumpData(genderRaw, sexLabel, decadeFrom, nNames = BUMP_N) {
  const all = natDecRows(genderRaw, sexLabel).filter((r) => r.decade >= decadeFrom);
  const totals = d3.rollup(all, (v) => d3.sum(v, (d) => d.nombre), (d) => d.preusuel);
  const topNames = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, nNames)
    .map(([n]) => n);

  const rows = all
    .filter((r) => topNames.includes(r.preusuel))
    .map((r) => {
      const decadeTotal = d3.sum(
        all.filter((x) => x.decade === r.decade && topNames.includes(x.preusuel)),
        (x) => x.nombre,
      );
      return {
        ...r,
        decade_label: `${r.decade}s`,
        share: decadeTotal > 0 ? r.nombre / decadeTotal : 0,
      };
    });

  const decades = [...new Set(rows.map((r) => r.decade))].sort((a, b) => a - b);
  const lookup = new Map(rows.map((r) => [`${r.preusuel}|${r.decade}`, r]));

  const byDecade = decades.map((decade) => {
    const items = topNames
      .map((name) => ({
        name,
        value: lookup.get(`${name}|${decade}`)?.nombre ?? 0,
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    let cum = 0;
    return items.map((item, rank) => {
      const y0 = cum;
      cum += item.value;
      return {
        decade,
        name: item.name,
        value: item.value,
        rank: rank + 1,
        y0,
        y1: cum,
      };
    });
  });

  const series = topNames.map((name) => ({
    name,
    total: totals.get(name) ?? 0,
    points: decades.map((decade, i) => {
      const pt = byDecade[i].find((d) => d.name === name);
      return {
        decade,
        y0: pt.y0,
        y1: pt.y1,
        value: pt.value,
        rank: pt.rank,
      };
    }),
  }));

  const yMax = d3.max(byDecade, (d) => d[d.length - 1]?.y1 ?? 0) || 1;
  const startRank = byDecade[0] ?? [];

  return { rows, topNames, decades, series, byDecade, yMax, startRank, lookup };
}

export function initStreamgraph(container, controlsEl, tooltipEl, genderRaw, decades) {
  const state = { sex: 'Female', from: decades[0] ?? 1900, highlight: null };

  controlsEl.innerHTML = `
    <div class="control-group">
      <label>Sex</label>
      <div class="radio-group">
        <label><input type="radio" name="stream-sex" value="Female" checked /> Girls</label>
        <label><input type="radio" name="stream-sex" value="Male" /> Boys</label>
      </div>
    </div>
    ${decadeSliderHtml('stream-from', 'From decade', decades, state.from)}
  `;

  controlsEl.querySelectorAll('input[name="stream-sex"]').forEach((el) => {
    el.addEventListener('change', () => {
      state.sex = el.value;
      state.highlight = null;
      render();
    });
  });

  bindDecadeSlider(controlsEl, 'stream-from', {
    onInput: (decade) => {
      state.from = decade;
    },
    onChange: () => {
      state.highlight = null;
      render();
    },
  });

  function showTooltip(event, d) {
    tooltipEl.classList.remove('hidden');
    tooltipEl.innerHTML = `
      <strong>${d.preusuel}</strong>
      ${d.decade_label}<br/>
      Rank: #${d.rank}<br/>
      Births: ${fmtNum(d.nombre)}<br/>
      Top-${BUMP_N} share: ${d3.format('.1%')(d.share)}
    `;
    const rect = container.parentElement.getBoundingClientRect();
    tooltipEl.style.left = `${event.clientX - rect.left + 12}px`;
    tooltipEl.style.top = `${event.clientY - rect.top + 12}px`;
  }

  function hideTooltip() {
    tooltipEl.classList.add('hidden');
  }

  function layerOpacity(name) {
    if (!state.highlight) return 0.9;
    return state.highlight === name ? 0.95 : 0.22;
  }

  function render() {
    const { rows, decades: decs, series, yMax, startRank } = buildBumpData(
      genderRaw,
      state.sex,
      state.from,
    );

    if (!rows.length) {
      container.innerHTML = '<p style="padding:2rem;color:#666">No data for this selection.</p>';
      return;
    }

    const sidebarW = 168;
    const width = Math.min(980, container.clientWidth || 980);
    const chartW = width - sidebarW;
    const height = Math.max(460, Math.min(640, 90 + decs.length * 30));
    const margin = { top: 52, right: 20, bottom: 36, left: 12 };
    const plotLeft = margin.left;
    const plotRight = chartW - margin.right;

    container.innerHTML = '';
    const root = d3.select(container).append('div').attr('class', 'stream-root');

    root
      .append('p')
      .attr('class', 'chart-inline-title')
      .text(
        `Ranked popularity streams — top ${BUMP_N} (${state.sex === 'Female' ? 'Girls' : 'Boys'})`,
      );

    root
      .append('p')
      .attr('class', 'chart-inline-subtitle')
      .text(
        `Vertical order = rank by births each decade; band width = births. Streams cross as rankings shift (${state.from}s–${decs[decs.length - 1]}s).`,
      );

    const layout = root.append('div').attr('class', 'bump-layout');

    const color = d3.scaleOrdinal(CHART_CATEGORICAL_BUMP).domain(series.map((s) => s.name));

    const maxTotal = d3.max(series, (s) => s.total) || 1;
    const popR = d3.scaleSqrt().domain([0, maxTotal]).range([3, 14]);

    const sidebar = layout.append('aside').attr('class', 'bump-sidebar');
    sidebar.append('p').attr('class', 'bump-sidebar-title').text('Names');
    sidebar.append('p').attr('class', 'bump-sidebar-sub').text(`Rank · ${state.from}s`);

    const list = sidebar.append('ul').attr('class', 'bump-name-list');
    startRank.forEach((item) => {
      const li = list
        .append('li')
        .attr('class', 'bump-name-item')
        .style('cursor', 'pointer')
        .on('click', () => {
          state.highlight = state.highlight === item.name ? null : item.name;
          render();
        });

      li.append('span')
        .attr('class', 'bump-rank-badge')
        .style('background', color(item.name))
        .text(item.rank);

      li.append('span')
        .attr('class', 'bump-name-label')
        .style('opacity', layerOpacity(item.name))
        .text(item.name);

      li.append('span')
        .attr('class', 'bump-pop-dot')
        .style('width', `${popR(item.value) * 2}px`)
        .style('height', `${popR(item.value) * 2}px`)
        .style('background', color(item.name))
        .style('opacity', layerOpacity(item.name));
    });

    sidebar
      .append('p')
      .attr('class', 'bump-scale-note')
      .text('Dot size ∝ births in first decade');

    const svg = layout
      .append('svg')
      .attr('class', 'stream-svg bump-svg')
      .attr('viewBox', `0 0 ${chartW} ${height}`)
      .attr('width', chartW)
      .attr('height', height);

    const x = d3
      .scalePoint()
      .domain(decs)
      .range([plotLeft, plotRight])
      .padding(0.12);

    const y = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const decadeStepPx =
      decs.length > 1 ? Math.abs(x(decs[1]) - x(decs[0])) : plotRight - plotLeft;

    svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'bump-plot-clip')
      .append('rect')
      .attr('x', plotLeft)
      .attr('y', margin.top)
      .attr('width', plotRight - plotLeft)
      .attr('height', height - margin.top - margin.bottom);

    decs.forEach((dec) => {
      svg
        .append('text')
        .attr('x', x(dec))
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .attr('class', 'bump-year-pill')
        .text(`${dec}s`);
    });

    const area = d3
      .area()
      .x((d) => x(d.decade))
      .y0((d) => y(d.y0))
      .y1((d) => y(d.y1))
      .curve(d3.curveMonotoneX);

    const g = svg.append('g').attr('clip-path', 'url(#bump-plot-clip)');

    g.selectAll('path.bump-stream')
      .data(series)
      .join('path')
      .attr('class', 'bump-stream')
      .attr('d', (d) => area(d.points))
      .attr('fill', (d) => color(d.name))
      .attr('stroke', 'rgba(255,255,255,0.85)')
      .attr('stroke-width', 0.7)
      .attr('opacity', (d) => (state.highlight ? layerOpacity(d.name) : 0.8))
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        state.highlight = state.highlight === d.name ? null : d.name;
        render();
      })
      .on('mousemove', function (event, d) {
        const [mx] = d3.pointer(event, svg.node());
        let nearest = decs[0];
        let minDist = Infinity;
        decs.forEach((dec) => {
          const dist = Math.abs(x(dec) - mx);
          if (dist < minDist) {
            minDist = dist;
            nearest = dec;
          }
        });
        const pt = d.points.find((p) => p.decade === nearest);
        const row = rows.find((r) => r.preusuel === d.name && r.decade === nearest);
        if (row && pt) {
          showTooltip(event, { ...row, rank: pt.rank });
        }
      })
      .on('mouseleave', hideTooltip);

    series.forEach((s) => {
      const peak = s.points.reduce(
        (best, pt) => (pt.value > best.value ? pt : best),
        s.points[0],
      );
      if (!peak || peak.value <= 0) return;

      const cx = x(peak.decade);
      const cy = y((peak.y0 + peak.y1) / 2);
      const bandHPx = Math.abs(y(peak.y0) - y(peak.y1));
      const label = bumpStreamLabel(s.name, bandHPx, decadeStepPx);
      if (label.type === 'none') return;

      const badge = svg
        .append('g')
        .attr('class', 'bump-stream-label')
        .attr('transform', `translate(${cx},${cy})`)
        .attr('opacity', layerOpacity(s.name))
        .style('pointer-events', 'none');

      if (label.type === 'name') {
        badge
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('class', 'bump-stream-label-text')
          .attr('font-size', label.fontSize)
          .attr('fill', CHART_THEME.ink)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2.5)
          .attr('paint-order', 'stroke')
          .text(label.text);
        return;
      }

      badge
        .append('circle')
        .attr('r', 8)
        .attr('fill', CHART_THEME.badgeFill)
        .attr('opacity', 0.92);

      badge
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', CHART_THEME.badgeText)
        .attr('font-size', 8)
        .attr('font-weight', 700)
        .text(peak.rank);
    });
  }

  render();
  window.addEventListener('resize', debounce(render, 200));
}
