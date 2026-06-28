import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import {
  GRID_COLS,
  GRID_ROWS,
  MIN_BIRTHS_DECADE,
  debounce,
  fmtNum,
  fmtPct,
  fmtRatioBand,
  decadeSliderHtml,
  bindDecadeSlider,
  CHART_BAND,
  CHART_CATEGORICAL_25,
  CHART_THEME,
} from './constants.js';

function trajectoryColor(bandIdx, colIdx) {
  return CHART_CATEGORICAL_25[bandIdx * GRID_COLS + colIdx] ?? CHART_THEME.muted;
}

export function ratioGrid(decadeRows) {
  const d = decadeRows.filter((r) => r.total >= MIN_BIRTHS_DECADE);
  const grid = [];
  const binRanges = [];
  const used = new Set();
  const entries = [];

  for (let binIdx = 0; binIdx < GRID_ROWS; binIdx += 1) {
    const lo = binIdx / GRID_ROWS;
    const hi = (binIdx + 1) / GRID_ROWS;
    const center = (lo + hi) / 2;
    binRanges.push([lo, hi]);

    const pool = d.filter((r) => !used.has(r.preusuel));
    let inBand = pool.filter((r) => r.female_ratio >= lo && r.female_ratio <= hi);
    inBand = [...inBand].sort((a, b) => b.total - a.total || a.preusuel.localeCompare(b.preusuel));
    let picked = inBand.slice(0, GRID_COLS).map((r) => r.preusuel);

    if (picked.length < GRID_COLS) {
      const rest = pool.filter((r) => !picked.includes(r.preusuel));
      rest.sort(
        (a, b) =>
          Math.abs(a.female_ratio - center) - Math.abs(b.female_ratio - center) ||
          b.total - a.total ||
          a.preusuel.localeCompare(b.preusuel),
      );
      picked = picked.concat(rest.slice(0, GRID_COLS - picked.length).map((r) => r.preusuel));
    }

    picked = picked.slice(0, GRID_COLS);
    picked.forEach((n) => used.add(n));
    grid.push([...picked, ...Array(GRID_COLS).fill(null)].slice(0, GRID_COLS));

    picked.forEach((name, colIdx) => {
      if (name) {
        entries.push({
          name,
          bandIdx: binIdx,
          colIdx,
          bandLo: lo,
          bandHi: hi,
          bandLabel: fmtRatioBand(lo, hi),
        });
      }
    });
  }

  return { grid, binRanges, entries };
}

function isFlat(points, threshold = 0.06) {
  if (!points.length) return true;
  const ratios = points.map((p) => p.female_ratio);
  return Math.max(...ratios) <= threshold || Math.min(...ratios) >= 1 - threshold;
}

function buildTrajectories(genderRaw, refDecade) {
  const refRows = genderRaw.filter((r) => r.decade === refDecade);
  const { binRanges, entries } = ratioGrid(refRows);

  const trajectories = entries
    .map((meta) => ({
      ...meta,
      color: trajectoryColor(meta.bandIdx, meta.colIdx),
      points: genderRaw
        .filter((r) => r.preusuel === meta.name && r.total > 0)
        .sort((a, b) => a.decade - b.decade),
    }))
    .filter((t) => !isFlat(t.points));

  return { trajectories, binRanges };
}

function trajectoryInsight(points) {
  if (points.length < 2) return '';
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.female_ratio - first.female_ratio;
  const dir =
    Math.abs(delta) < 0.05
      ? 'stable'
      : delta > 0
        ? 'toward girls'
        : 'toward boys';
  return `${fmtPct(first.female_ratio)} girls (${first.decade}s) → ${fmtPct(last.female_ratio)} (${last.decade}s) · ${dir} (Δ ${delta >= 0 ? '+' : ''}${fmtPct(delta)})`;
}

/** Horizontal padding so 0%/100% points don't sit on the y-axis edge. */
const X_RATIO_PAD = 0.05;

/** Label at the newest decade (top of chart). */
function newestPoint(points) {
  return points.length ? points[points.length - 1] : null;
}

/** Avoid overlapping name labels when endpoints cluster on the x-axis. */
function layoutTrajectoryLabels(trajectories, x, y) {
  const pad = 8;
  const lineH = 11;
  const placed = [];

  const items = trajectories
    .map((t) => {
      const pt = newestPoint(t.points);
      if (!pt) return null;
      const px = x(pt.female_ratio);
      const py = y(pt.decade);
      const atRight = pt.female_ratio >= 0.92;
      const atLeft = pt.female_ratio <= 0.08;
      const dx = atRight ? -pad : atLeft ? pad : pad;
      const anchor = atRight ? 'end' : 'start';
      return { t, pt, px, py, dx, anchor, dy: 0 };
    })
    .filter(Boolean)
    .sort((a, b) => a.px - b.px);

  items.forEach((item) => {
    let dy = 0;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const conflict = placed.some(
        (p) => Math.abs(p.px - item.px) < 52 && Math.abs(p.py + p.dy - (item.py + dy)) < lineH,
      );
      if (!conflict) break;
      const step = Math.ceil(attempt / 2) * lineH;
      dy += attempt % 2 === 0 ? step : -step;
    }
    item.dy = dy;
    placed.push(item);
  });

  return items;
}

export function initGenderTrajectory(container, controlsEl, tooltipEl, genderRaw, decades) {
  const state = {
    refDecade: decades.includes(2010) ? 2010 : decades[decades.length - 1],
    bandFilter: 'all',
    highlight: null,
  };

  // Stored selections for hover highlight without re-render
  let _trajPaths = null;
  let _trajLabels = null;

  function applyGenderHighlight(name) {
    if (!_trajPaths) return;
    _trajPaths.attr('opacity', function () {
      if (!name) return this.getAttribute('data-init-op');
      return this.getAttribute('data-name') === name ? 1 : 0.07;
    }).attr('stroke-width', function () {
      if (!name) return this.getAttribute('data-init-sw');
      return this.getAttribute('data-name') === name ? 3.2 : 1.0;
    });
    _trajLabels?.attr('opacity', function () {
      if (!name) return this.getAttribute('data-init-op');
      return this.getAttribute('data-name') === name ? 1 : 0.04;
    });
  }

  function renderControls(trajectories) {
    const bands = [...new Set(trajectories.map((t) => t.bandIdx))].sort((a, b) => a - b);

    controlsEl.innerHTML = `
      ${decadeSliderHtml('traj-ref-decade', 'Reference decade (selects the 25 names)', decades, state.refDecade)}
      <div class="control-group">
        <label for="traj-band">Female ratio band</label>
        <select id="traj-band">
          <option value="all"${state.bandFilter === 'all' ? ' selected' : ''}>All (25 names)</option>
          ${bands
            .map((b) => {
              const t = trajectories.find((x) => x.bandIdx === b);
              return `<option value="${b}"${state.bandFilter === String(b) ? ' selected' : ''}>${t?.bandLabel ?? b}</option>`;
            })
            .join('')}
        </select>
      </div>
      <div class="control-group">
        <label for="traj-highlight">Highlight</label>
        <select id="traj-highlight">
          <option value="">— All trajectories —</option>
          ${trajectories
            .map(
              (t) =>
                `<option value="${t.name}"${state.highlight === t.name ? ' selected' : ''}>[${t.bandLabel}] ${t.name}</option>`,
            )
            .join('')}
        </select>
      </div>
    `;

    bindDecadeSlider(controlsEl, 'traj-ref-decade', {
      onInput: (decade) => {
        state.refDecade = decade;
      },
      onChange: () => {
        state.highlight = null;
        render();
      },
    });
    controlsEl.querySelector('#traj-band').addEventListener('change', (e) => {
      state.bandFilter = e.target.value;
      if (state.bandFilter !== 'all' && state.highlight) {
        const t = trajectories.find((x) => x.name === state.highlight);
        if (t && String(t.bandIdx) !== state.bandFilter) state.highlight = null;
      }
      render();
    });
    controlsEl.querySelector('#traj-highlight').addEventListener('change', (e) => {
      state.highlight = e.target.value || null;
      render();
    });
  }

  function lineOpacity(t) {
    if (state.bandFilter !== 'all' && String(t.bandIdx) !== state.bandFilter) return 0.08;
    if (state.highlight && state.highlight !== t.name) return 0.12;
    if (state.highlight === t.name) return 1;
    return 0.55;
  }

  function lineWidth(t) {
    if (state.highlight === t.name) return 3.2;
    if (state.highlight) return 1.2;
    return 1.8;
  }

  function showTooltip(event, d, meta) {
    tooltipEl.classList.remove('hidden');
    tooltipEl.innerHTML = `
      <strong>${meta.name}</strong>
      <span style="color:${meta.color}">●</span> ${meta.bandLabel}<br/>
      ${d.decade}s · ${fmtPct(d.female_ratio)} girls<br/>
      Births: ${fmtNum(d.total)}
    `;
    const rect = container.parentElement.getBoundingClientRect();
    tooltipEl.style.left = `${event.clientX - rect.left + 12}px`;
    tooltipEl.style.top = `${event.clientY - rect.top + 12}px`;
  }

  function hideTooltip() {
    tooltipEl.classList.add('hidden');
  }

  function render() {
    const { trajectories, binRanges } = buildTrajectories(genderRaw, state.refDecade);
    renderControls(trajectories);

    const visible = trajectories.filter(
      (t) => state.bandFilter === 'all' || String(t.bandIdx) === state.bandFilter,
    );

    const width = Math.min(960, container.clientWidth || 960);
    const height = 560;
    const margin = { top: 88, right: 24, bottom: 56, left: 72 };

    container.innerHTML = '';

    if (!visible.length) {
      container.innerHTML = '<p style="padding:2rem;color:#666">No data for this selection.</p>';
      return;
    }

    const root = d3.select(container).append('div').attr('class', 'trajectory-root');

    const hi = state.highlight
      ? trajectories.find((t) => t.name === state.highlight)
      : null;
    const insight = hi ? trajectoryInsight(hi.points) : '';

    root.append('p').attr('class', 'chart-inline-title').text(
      `Gender trajectories — top 5 per band (${state.refDecade}s)`,
    );
    root
      .append('p')
      .attr('class', 'chart-inline-subtitle')
      .text(
        insight ||
          '25 names chosen like the 3.3 grid: 5 female-ratio bands × 5 most popular each. Click a curve to explore.',
      );

    const layout = root.append('div').attr('class', 'trajectory-layout');

    const svg = layout
      .append('svg')
      .attr('class', 'trajectory-svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height);

    const x = d3
      .scaleLinear()
      .domain([-X_RATIO_PAD, 1 + X_RATIO_PAD])
      .range([margin.left, width - margin.right]);

    const allDecades = [...new Set(genderRaw.map((r) => r.decade))].sort((a, b) => a - b);
    const y = d3
      .scaleLinear()
      .domain([allDecades[allDecades.length - 1], allDecades[0]])
      .range([margin.top, height - margin.bottom]);

    const chartG = svg.append('g');

    binRanges.forEach(([lo, hi], i) => {
      chartG
        .append('rect')
        .attr('x', x(lo))
        .attr('y', margin.top)
        .attr('width', x(hi) - x(lo))
        .attr('height', height - margin.top - margin.bottom)
        .attr('fill', CHART_BAND[i])
        .attr('opacity', 0.07);
    });

    chartG
      .append('line')
      .attr('x1', x(0.5))
      .attr('x2', x(0.5))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', CHART_THEME.muted)
      .attr('stroke-dasharray', '4,4');

    chartG
      .append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', y(state.refDecade))
      .attr('y2', y(state.refDecade))
      .attr('stroke', CHART_THEME.balance)
      .attr('stroke-dasharray', '6,4')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.7);

    chartG
      .append('text')
      .attr('x', width - margin.right)
      .attr('y', y(state.refDecade) < margin.top + 16 ? y(state.refDecade) + 14 : y(state.refDecade) - 6)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .attr('fill', CHART_THEME.balance)
      .text(`Ref. ${state.refDecade}s`);

    const line = d3
      .line()
      .defined((d) => d.total > 0)
      .x((d) => x(d.female_ratio))
      .y((d) => y(d.decade))
      .curve(d3.curveMonotoneX);

    const trajG = chartG.append('g').attr('class', 'trajectories');

    visible.forEach((t) => {
      const initOp = lineOpacity(t);
      const initSw = lineWidth(t);

      const g = trajG
        .append('g')
        .attr('class', 'trajectory')
        .style('cursor', 'pointer')
        .on('click', () => {
          state.highlight = state.highlight === t.name ? null : t.name;
          render();
        });

      g.append('path')
        .datum(t.points)
        .attr('fill', 'none')
        .attr('stroke', t.color)
        .attr('stroke-width', initSw)
        .attr('opacity', initOp)
        .attr('data-name', t.name)
        .attr('data-init-op', initOp)
        .attr('data-init-sw', initSw)
        .attr('d', line);

      g.selectAll('circle')
        .data(t.points)
        .join('circle')
        .attr('cx', (d) => x(d.female_ratio))
        .attr('cy', (d) => y(d.decade))
        .attr('r', state.highlight === t.name ? 4.5 : 2.5)
        .attr('fill', t.color)
        .attr('stroke', CHART_THEME.streamStroke)
        .attr('stroke-width', 1)
        .attr('opacity', initOp)
        .on('mousemove', (event, d) => showTooltip(event, d, t))
        .on('mouseleave', hideTooltip);
    });

    _trajPaths = trajG.selectAll('.trajectory path');

    const labelsG = chartG.append('g').attr('class', 'trajectory-labels');
    layoutTrajectoryLabels(visible, x, y).forEach(({ t, px, py, dx, dy, anchor }) => {
      const isHi = state.highlight === t.name;
      const initOp = isHi ? 1 : Math.min(lineOpacity(t) + 0.25, 0.92);
      labelsG
        .append('text')
        .attr('class', 'trajectory-name-label')
        .attr('data-name', t.name)
        .attr('data-init-op', initOp)
        .attr('x', px + dx)
        .attr('y', py + dy)
        .attr('text-anchor', anchor)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', isHi ? 11 : 9)
        .attr('font-weight', isHi ? 700 : 600)
        .attr('fill', t.color)
        .attr('opacity', initOp)
        .style('pointer-events', 'none')
        .text(t.name);
    });

    _trajLabels = labelsG.selectAll('text');

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues([0, 0.25, 0.5, 0.75, 1])
          .tickFormat((d) => `${Math.round(d * 100)}% F`),
      )
      .selectAll('text')
      .attr('font-size', 11);

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', CHART_THEME.muted)
      .attr('font-size', 11)
      .text('← 100% boys · 50/50 · 100% girls →');

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(allDecades.length).tickFormat((d) => `${d}s`))
      .selectAll('text')
      .attr('font-size', 10);

    svg
      .append('text')
      .attr('x', margin.left - 8)
      .attr('y', margin.top - 10)
      .attr('text-anchor', 'end')
      .attr('fill', CHART_THEME.muted)
      .attr('font-size', 9)
      .text('newer ↑');

    const legend = layout.append('div').attr('class', 'trajectory-legend');
    legend.append('p').attr('class', 'trajectory-legend-title').text(
      `25 names · bands at ${state.refDecade}s`,
    );

    binRanges.forEach(([lo, hi], bandIdx) => {
      const bandTraj = trajectories.filter((t) => t.bandIdx === bandIdx);
      if (!bandTraj.length) return;

      const block = legend.append('div').attr('class', 'trajectory-band');
      block
        .append('div')
        .attr('class', 'trajectory-band-head')
        .style('border-left-color', CHART_BAND[bandIdx])
        .html(`<strong>${fmtRatioBand(lo, hi)}</strong> girls`);

      const list = block.append('ul');
      bandTraj.forEach((t) => {
        const refPt = t.points.find((p) => p.decade === state.refDecade);
        const li = list
          .append('li')
          .classed('is-active', state.highlight === t.name)
          .style('--name-color', t.color)
          .on('click', () => {
            state.highlight = state.highlight === t.name ? null : t.name;
            state.bandFilter = 'all';
            render();
          })
          .on('mouseenter', () => {
            if (!state.highlight) applyGenderHighlight(t.name);
          })
          .on('mouseleave', () => {
            if (!state.highlight) applyGenderHighlight(null);
          });
        li.html(
          `<span style="color:${t.color}">●</span> <span>${t.name}</span><small>${refPt ? fmtPct(refPt.female_ratio) : '—'} · ${refPt ? fmtNum(refPt.total) : ''}</small>`,
        );
      });
    });
  }

  render();
  window.addEventListener('resize', debounce(render, 200));
}
