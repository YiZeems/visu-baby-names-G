import { DPT_TO_REG } from './constants.js';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      const v = values[i];
      row[h] = v === undefined || v === '' ? null : v;
    });
    return row;
  });
}

function toNum(row, ...keys) {
  const out = { ...row };
  keys.forEach((k) => {
    if (out[k] != null) out[k] = Number(out[k]);
  });
  return out;
}

export async function loadAppData() {
  const [genderText, mapText, geo] = await Promise.all([
    fetch('/data/gender_data.csv').then((r) => {
      if (!r.ok) throw new Error(`gender_data.csv: ${r.status}`);
      return r.text();
    }),
    fetch('/data/map_data.csv').then((r) => {
      if (!r.ok) throw new Error(`map_data.csv: ${r.status}`);
      return r.text();
    }),
    fetch('/data/departements.geojson').then((r) => {
      if (!r.ok) throw new Error(`departements.geojson: ${r.status}`);
      return r.json();
    }),
  ]);

  const genderRaw = parseCSV(genderText).map((r) =>
    toNum(r, 'decade', 'male', 'female', 'total', 'female_ratio', 'mixedness'),
  );

  const mapRaw = parseCSV(mapText).map((r) =>
    toNum(r, 'decade', 'nombre', 'total_births', 'rate_per_10k'),
  );

  mapRaw.forEach((r) => {
    r.region = DPT_TO_REG[r.dpt] ?? null;
  });

  const totalsByName = new Map();
  genderRaw.forEach((r) => {
    totalsByName.set(r.preusuel, (totalsByName.get(r.preusuel) ?? 0) + r.total);
  });

  const top50 = [...totalsByName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name]) => name);

  const top20Map = top50.slice(0, 20);
  const decades = [...new Set(genderRaw.map((r) => r.decade))].sort((a, b) => a - b);
  const decadesMap = [...new Set(mapRaw.map((r) => r.decade))].sort((a, b) => a - b);

  const genderByDecade = new Map();
  genderRaw.forEach((r) => {
    if (!genderByDecade.has(r.decade)) genderByDecade.set(r.decade, []);
    genderByDecade.get(r.decade).push(r);
  });

  const mapIndex = new Map();
  mapRaw.forEach((r) => {
    const key = `${r.preusuel}|${r.decade}`;
    if (!mapIndex.has(key)) mapIndex.set(key, []);
    mapIndex.get(key).push(r);
  });

  const meta = {
    nameCount: totalsByName.size,
    decades,
    yearMin: Math.min(...decades),
    yearMax: Math.max(...decades) + 9,
    genderRows: genderRaw.length,
    mapRows: mapRaw.length,
  };

  return {
    meta,
    genderRaw,
    genderByDecade,
    mapRaw,
    mapIndex,
    geo,
    top50,
    top20Map,
    decades,
    decadesMap,
  };
}

/** Build nat_dec-like rows for vines from gender data. */
export function natDecRows(genderRaw, sexLabel) {
  const field = sexLabel === 'Female' ? 'female' : 'male';
  const rows = genderRaw
    .filter((r) => r[field] > 0)
    .map((r) => ({
      preusuel: r.preusuel,
      decade: r.decade,
      sexe: sexLabel === 'Female' ? 2 : 1,
      nombre: r[field],
      sex_label: sexLabel,
    }));

  const byDecadeSex = new Map();
  rows.forEach((r) => {
    const k = `${r.decade}|${r.sex_label}`;
    if (!byDecadeSex.has(k)) byDecadeSex.set(k, []);
    byDecadeSex.get(k).push(r);
  });

  byDecadeSex.forEach((group) => {
    group.sort((a, b) => b.nombre - a.nombre);
    group.forEach((r, i) => {
      r.rank = i + 1;
    });
  });

  return rows;
}

export function getMapRows(mapIndex, name, decade) {
  return mapIndex.get(`${name}|${decade}`) ?? [];
}
