# Baby Names — Group G

Mini-project on French baby names (1900–2022) for the Data Visualization course.

## Data

The dataset comes from the French national statistics office (INSEE): **Fichier des prénoms par département**.  
It contains all first names registered in France, year by year and department by department, from 1900 to 2022.

- `data/dpt2020.csv` — main dataset (~3.8M rows, format: `sexe;preusuel;annais;dpt;nombre`)
- `data/departements.geojson` — simplified GeoJSON map of French departments
- `data/bump_data.csv`, `data/map_data.csv`, `data/gender_data.csv` — optional pre-aggregated exports (the implementation notebook recomputes aggregates from `dpt2020.csv`)

## Setup

Requires Python 3.11 and [uv](https://github.com/astral-sh/uv).

```bash
uv sync
```

Then launch Jupyter:

```bash
source .venv/bin/activate
jupyter notebook
```

Open `notebooks/baby_names_9_implementation.ipynb` and run all cells to view the interactive charts.

## Notebooks

| Notebook | Description |
|---|---|
| `notebooks/baby_names_30_viz_group_G_.ipynb` | Week 1 — Brainstorming: 30 visualization ideas (3 questions × 10 ideas) |
| `notebooks/baby_names_9_viz_group_G_.ipynb` | Week 1 — Selection: 9 finalists (3 per question) with justifications |
| `notebooks/baby_names_9_implementation.ipynb` | Week 2 — Implementation: 9 interactive visualizations (Altair + ipywidgets + matplotlib) |

## Visualizations (Week 2)

Selected designs: **1.6, 1.8, 1.2** · **2.1, 2.9, 2.4** · **3.3, 3.8, 3.6**

### Question 1 — How do baby names evolve over time?

- **1.6 Leaf timeline** — top-10 names as vertical vines; leaf size = births, color = relative popularity per decade. Radio button to switch Female / Male.
- **1.8 Name genealogy** — long-running “dynasty” names (top 8 for ≥ 5 decades) linked across generations. Click a branch to highlight; radio button for sex.
- **1.2 Bump chart** — rank of the top 10 names per decade. Click a line to highlight. Radio button to switch Female / Male.

### Question 2 — Is there a regional effect?

- **2.1 Choropleth map** — French departments colored by births per 10,000 for a selected name and decade. Name and decade dropdowns.
- **2.9 Regional flower** — schematic flower: each petal = one macro-region (Nord, Ouest, IDF, Est, S-O, S-E, Corse, Centre); petal length = births per 10k. Name and decade dropdowns.
- **2.4 Department ranking** — horizontal bar chart of the top 20 departments for a selected name and decade.

### Question 3 — Are there gender effects?

- **3.3 Baby ratio sketch** — three unisex names (Claude, Camille, Sasha) as hand-drawn baby silhouettes split blue/pink by % male vs % female. Decade dropdown.
- **3.8 Gender trajectory** — for a unisex name, female ratio over time (horizontal drift = shift toward girls or boys). Name dropdown.
- **3.6 Scatterplot** — each dot = one name. X = total births (log), Y = female ratio. Decade slider; click a dot to highlight.

## Dependencies

See `pyproject.toml`. Main libraries: `altair`, `pandas`, `geopandas`, `matplotlib`, `ipywidgets` (via Jupyter), `jupyter`, `vegafusion`.
