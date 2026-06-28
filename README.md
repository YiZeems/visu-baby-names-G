# Baby Names, Group G

Mini-project on French baby names (1900 to 2022) for **CSC 4IG07, Data Visualization**.

**Final deliverable:** interactive web app in [`app/`](app/), three linked views over **time**, **space**, and **gender**. See [`app/README.md`](app/README.md) for details.

| Section | Visualization |
| --- | --- |
| **1. Temporal** | Ranked area bump streams, top 20 |
| **2. Regional** | Choropleth map + regional compass |
| **3. Gender** | Gender ratio trajectories, 25 names, 5 bands |

## Design rationale

Our **first three chart choices**, prototyped in [`notebooks/baby_names_3_implementation.ipynb`](notebooks/baby_names_3_implementation.ipynb), had a high risk of **chartjunk** (visual elements that add complexity without adding information). After a critical review, we replaced them with three more rigorous views in the web app:

| Dimension | First iteration | Final app |
| --- | --- | --- |
| **Temporal** | 1.6 Popularity vines (botanical metaphor) | Ranked area bump streams |
| **Regional** | 2.1 Choropleth + 2.9 Regional compass | Same pairing (refined scales and layout) |
| **Gender** | 3.3 Boys vs girls per name (silhouette icons) | Gender ratio trajectories |

## Before and after

First iteration [`notebooks/baby_names_3_implementation.ipynb`](notebooks/baby_names_3_implementation.ipynb) to final web app [`app/`](app/).

<table>
  <tr>
    <th align="center" width="48%">Before: notebook prototypes</th>
    <th align="center" width="52%">After: web app</th>
  </tr>
  <tr>
    <td valign="top">
      <p><strong>1. Temporal</strong> · Popularity vines (botanical metaphor)</p>
      <img src="app/images/before-temporal-vines.png" alt="Before: popularity vines" width="100%" />
      <p><strong>2. Regional</strong> · choropleth + regional compass</p>
      <img src="app/images/before-regional-map.png" alt="Before: department map and regional compass" width="100%" />
      <p><strong>3. Gender</strong> · Boys vs girls (silhouette icons)</p>
      <img src="app/images/before-gender-silhouettes.png" alt="Before: boys vs girls silhouettes" width="100%" />
    </td>
    <td valign="top">
      <p><strong>Ranked area bump streams</strong> · <strong>map + compass</strong> (refined) · <strong>gender ratio trajectories</strong></p>
      <img src="app/images/after-dashboard.png" alt="After: French Baby Names Explorer dashboard" width="100%" />
    </td>
  </tr>
</table>

**Ranked popularity streams** encode both rank and volume in one glance; stream crossings highlight shifts in popularity (overlap can make individual names harder to follow).

**Department map and regional compass** offer departmental detail and macro-regional synthesis without duplicating data; subtle rate differences can be flattened by the color scale, and compass rays fade when values are near zero.

**Gender ratio trajectories** show names that drift between genders over decades; the 5x5 grid structures comparison, though 25 curves can crowd labels at the endpoints.

These three views cover the core dimensions of the dataset with minimal visual noise and maximum useful encoding.

## Peer feedback, Week 7

After publishing our three visualizations, we received 12 peer reviews from classmates. The recurring points for each chart were:

**Viz 1. Ranked popularity streams**
- Hard to follow a single name when streams cross: reviewers unanimously requested a hover or click interaction to highlight one stream and fade the others.
- Visual collapse after the 1960s: as name diversity grew, the top 20 bands became too thin to read. Several reviewers noted that a normalized (share based) view would fix this.

**Viz 2. Department map and regional compass**
- The color scale was dominated by peak values, making the map near-uniformly dark for low frequency names. Reviewers suggested a quantile or log scale.
- Compass labels overlapped near the center and were hard to read. One reviewer also pointed out that the tooltip displayed "Rate / 10k: 0.0" due to insufficient decimal places.

**Viz 3. Gender ratio trajectories**
- Label overlap at the endpoints with 25 simultaneous trajectories was the most common complaint. Reviewers suggested a hover interaction on legend items as a solution.
- Names permanently stuck at 0% or 100% female (e.g. LUCAS) were flagged as clutter: they carry no gender drift information and should be hidden automatically.

## What we changed

We addressed the two most cited issues for each visualization:

**Viz 1**
- Added hover highlight: mousing over a stream or a name in the sidebar fades all others instantly, without requiring a click.
- Added a "Share" toggle that normalizes each decade to 100% of the top 20 pool, keeping all bands readable even in recent decades when name diversity is high.

**Viz 2**
- Switched to a quantile color scale (d3.scaleSequentialQuantile) that spreads colors evenly across the actual data distribution, preventing outliers from washing out the map.
- Added white text halos to compass labels for readability, and fixed the tooltip to show two decimal places for rate values below 1.

**Viz 3**
- Flat trajectories (names that never leave the 0 to 6% or 94 to 100% female band) are now filtered out automatically before rendering.
- Hovering over a name in the legend fades all other curves, providing details on demand without needing to interact with the chart directly.

## Final visualization

The web app is the final deliverable. It runs entirely in the browser with no backend.

**Requirements:** Node.js 18 or later.

**Important on Windows:** the files in `app/public/data/` are placeholders. Before running, copy the real data files:

```powershell
Copy-Item "data\departements.geojson" -Destination "app\public\data\departements.geojson" -Force
Copy-Item "data\gender_data.csv"      -Destination "app\public\data\gender_data.csv"      -Force
Copy-Item "data\map_data.csv"         -Destination "app\public\data\map_data.csv"         -Force
```

**Launch:**

```powershell
cd app
npm install
npm run dev
```

Then open the URL shown in the terminal (default `http://localhost:5173`).

To build a static version for deployment:

```powershell
npm run build
npm run preview
```

## Data

The dataset comes from the French national statistics office (INSEE): Fichier des prenoms par departement.
It contains all first names registered in France, year by year and department by department, from 1900 to 2022.

- `data/dpt2020.csv`: main dataset (~3.8M rows, format: `sexe;preusuel;annais;dpt;nombre`)
- `data/departements.geojson`: simplified GeoJSON map of French departments
- `data/bump_data.csv`, `data/map_data.csv`, `data/gender_data.csv`: pre-aggregated exports used by the web app (notebooks can recompute from `dpt2020.csv`)

## Notebooks (exploration and iteration)

Requires Python 3.11 and [uv](https://github.com/astral-sh/uv).

```bash
uv sync
uv run jupyter notebook
```

| Notebook | Description |
| --- | --- |
| `notebooks/baby_names_30_viz_group_G_.ipynb` | Week 1. Brainstorming: 30 visualization ideas (3 questions x 10 ideas) |
| `notebooks/baby_names_9_viz_group_G_.ipynb` | Week 1. Selection: 9 finalists (3 per question) with justifications |
| `notebooks/baby_names_9_implementation.ipynb` | Week 2. Nine interactive prototypes (Altair + ipywidgets + matplotlib) |
| `notebooks/baby_names_3_implementation.ipynb` | First three chart iteration (vines, compass, silhouettes), superseded by the web app |

## Dependencies

- **Web app:** Vite, D3.js, see [`app/package.json`](app/package.json)
- **Notebooks:** see `pyproject.toml`, altair, pandas, geopandas, matplotlib, ipywidgets, jupyter, vegafusion
