import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { LEAF_PATH, leafAngle, fmtNum, debounce } from './constants.js';
import { natDecRows } from './data.js';

const GREEN = d3.interpolateGreens;

function buildVinesData(genderRaw, sexLabel, decadeFrom) {
  const all = natDecRows(genderRaw, sexLabel).filter((r) => r.decade >= decadeFrom);
  const totals = d3.rollup(all, (v) => d3.sum(v, (d) => d.nombre), (d) => d.preusuel);
  const topNames = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([n]) => n);

  const rows = all
    .filter((r) => topNames.includes(r.preusuel))
    .map((r) => {
      const decadeRows = all.filter((x) => x.decade === r.decade && topNames.includes(x.preusuel));
      const maxInDecade = d3.max(decadeRows, (x) => x.nombre) || 1;
      return {
        ...r,
        decade_label: `${r.decade}s`,
        norm: r.nombre / maxInDecade,
        leaf_angle: leafAngle(r.preusuel, r.decade),
      };
    });

  return { rows, topNames, decades: [...new Set(rows.map((r) => r.decade))].sort((a, b) => a - b) };
}

export function initVines(container, controlsEl, tooltipEl, genderRaw, decades) {
  const state = { sex: 'Female', from: decades[0] ?? 1900 };

  controlsEl.innerHTML = `
    <div class="control-group">
      <label>Sexe</label>
      <div class="radio-group">
        <label><input type="radio" name="vines-sex" value="Female" checked /> Filles</label>
        <label><input type="radio" name="vines-sex" value="Male" /> Garçons</label>
      </div>
    </div>
    <div class="control-group">
      <label for="vines-from">Depuis la décennie</label>
      <input id="vines-from" type="range" min="${decades[0]}" max="${decades[decades.length - 1]}" step="10" value="${state.from}" />
      <output id="vines-from-label">${state.from}s</output>
    </div>
  `;

  controlsEl.querySelectorAll('input[name="vines-sex"]').forEach((el) => {
    el.addEventListener('change', () => {
      state.sex = el.value;
      render();
    });
  });

  const slider = controlsEl.querySelector('#vines-from');
  const sliderLabel = controlsEl.querySelector('#vines-from-label');
  slider.addEventListener('input', () => {
    state.from = Number(slider.value);
    sliderLabel.textContent = `${state.from}s`;
  });
  slider.addEventListener('change', render);

  function showTooltip(event, d) {
    tooltipEl.classList.remove('hidden');
    tooltipEl.innerHTML = `
      <strong>${d.preusuel}</strong>
      ${d.decade_label}<br/>
      Naissances : ${fmtNum(d.nombre)}<br/>
      Popularité relative : ${d.norm.toFixed(2)}
    `;
    const rect = container.parentElement.getBoundingClientRect();
    tooltipEl.style.left = `${event.clientX - rect.left + 12}px`;
    tooltipEl.style.top = `${event.clientY - rect.top + 12}px`;
  }

  function hideTooltip() {
    tooltipEl.classList.add('hidden');
  }

  function render() {
    const { rows, topNames, decades: decs } = buildVinesData(genderRaw, state.sex, state.from);
    if (!rows.length) {
      container.innerHTML = '<p style="padding:2rem;color:#666">Aucune donnée pour cette sélection.</p>';
      return;
    }

    const width = Math.min(920, container.clientWidth || 920);
    const height = Math.max(420, Math.min(720, 120 + decs.length * 42));
    const margin = { top: 56, right: 24, bottom: 48, left: 24 };

    container.innerHTML = '';
    const svg = d3
      .select(container)
      .append('svg')
      .attr('class', 'vines-svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height);

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', 28)
      .attr('class', 'map-title')
      .text(`Popularity vines — top 10 (${state.sex === 'Female' ? 'Filles' : 'Garçons'})`);

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', 46)
      .attr('class', 'map-subtitle')
      .text(
        `Vignes ${state.from}s–${decs[decs.length - 1]}s · feuille = naissances · vert = popularité relative`,
      );

    const x = d3
      .scaleBand()
      .domain(topNames)
      .range([margin.left, width - margin.right])
      .padding(0.25);

    const y = d3
      .scaleLinear()
      .domain([decs[decs.length - 1], decs[0]])
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line()
      .x((d) => x(d.preusuel) + x.bandwidth() / 2)
      .y((d) => y(d.decade))
      .curve(d3.curveMonotoneY);

    const byName = d3.group(rows, (d) => d.preusuel);

    svg
      .append('g')
      .selectAll('path')
      .data(topNames)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#689f38')
      .attr('stroke-width', 2)
      .attr('opacity', 0.75)
      .attr('d', (name) => line(byName.get(name).sort((a, b) => a.decade - b.decade)));

    const size = d3.scaleSqrt().domain([0, d3.max(rows, (d) => d.nombre)]).range([5, 18]);

    const leaves = svg
      .append('g')
      .selectAll('g')
      .data(rows)
      .join('g')
      .attr('class', 'leaf')
      .attr(
        'transform',
        (d) =>
          `translate(${x(d.preusuel) + x.bandwidth() / 2},${y(d.decade)}) rotate(${d.leaf_angle}) scale(${size(d.nombre) / 7})`,
      )
      .on('mousemove', (event, d) => showTooltip(event, d))
      .on('mouseleave', hideTooltip);

    leaves
      .append('path')
      .attr('d', LEAF_PATH)
      .attr('fill', (d) => GREEN(0.25 + d.norm * 0.75))
      .attr('stroke', '#1b5e20')
      .attr('stroke-width', 0.35);

    const yAxis = d3.axisLeft(y).tickValues(decs).tickFormat((d) => `${d}s`);
    svg
      .append('g')
      .attr('transform', `translate(${margin.left - 8},0)`)
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', 11);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.4em')
      .attr('dy', '0.15em')
      .attr('font-size', 11);

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .attr('font-size', 11)
      .text('Prénom (top 10, total sur la période)');
  }

  render();
  window.addEventListener('resize', debounce(render, 200));
}
