# Baby Names — Web App

Interactive JavaScript app with the **3 visualizations** from `notebooks/baby_names_3_implementation_new.ipynb`:

| Section | Visualization |
|---|---|
| **1 — Temporal** | 1.6 Ranked area bump streams — top 20 (D3) |
| **2 — Regional** | 2.1 Choropleth + 2.9 Regional compass (D3 + GeoJSON) |
| **3 — Gender** | 3.8 Gender trajectories — 25 names, 5 bands (D3) |

## Requirements

- Node.js 18+
- Data files served from `public/data/` (symlinks to `../data/`):
  - `gender_data.csv`
  - `map_data.csv`
  - `departements.geojson`

## Run locally

```bash
cd app
npm install
npm run dev
```

Open the URL shown in the terminal (default http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

## Stack

- [Vite](https://vitejs.dev/) — dev server and bundler
- [D3.js](https://d3js.org/) (CDN ESM) — streamgraph, map, compass, gender trajectories

## Controls

- **Ranked streams**: sex, start decade, click a stream or sidebar name to highlight
- **Regional**: name (top 20), decade
- **Gender trajectories**: reference decade (5×5 selection), band filter, highlight a name
