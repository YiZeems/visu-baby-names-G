# Baby Names — Group G

Mini-project on French baby names (1900–2022) for the Data Visualization course.

## Data

The dataset comes from the French national statistics office (INSEE): **Fichier des prénoms par département**.  
It contains all first names registered in France, year by year and department by department, from 1900 to 2022.

- `data/dpt2020.csv` — main dataset (~3.8M rows, format: `sexe;preusuel;annais;dpt;nombre`)
- `data/departements.geojson` — simplified GeoJSON map of French departments
- `data/bump_data.csv`, `data/map_data.csv`, `data/gender_data.csv` — pre-computed data for the visualizations

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

## Notebooks

| Notebook | Description |
|---|---|
| `notebooks/baby_names_30_viz_group_G_.ipynb` | Week 1 — Brainstorming: 30 visualization ideas (3 questions × 10 ideas) |
| `notebooks/baby_names_9_viz_group_G_.ipynb` | Week 1 — Selection: 9 finalists (3 per question) with justifications |
| `notebooks/week2_implementation.ipynb` | Week 2 — Implementation: 9 interactive Altair visualizations |

## Visualizations (Week 2)

### Question 1 — How do baby names evolve over time?

- **1.2 Bump chart** — rank of the top 10 names per decade. Click a line to highlight it. Radio button to switch between male/female.
- **1.6 Heatmap** — name × decade grid. Color intensity = relative popularity. Names sorted by their peak decade.
- **1.8 Streamgraph** — band width = number of births per year for the top 12 names. Radio button to switch sex.

### Question 2 — Is there a regional effect?

- **2.1 Choropleth map** — French departments colored by births per 10,000 for a selected name and decade. Use the dropdowns.
- **2.3 Department ranking** — horizontal bar chart of the top 20 departments for a selected name and decade.
- **2.8 Regional bars** — births per 10,000 aggregated by region for a selected name and decade.

### Question 3 — Are there gender effects?

- **3.3 Diverging bar** — 25 most gender-mixed names, showing % male vs % female of total births.
- **3.6 Scatterplot** — each dot = one name. X axis = total births (log), Y axis = female ratio. Slider to change decade.
- **3.7 Mini-cards** — small multiples: one bar chart per name showing % male vs % female (decade 2010).

## Dependencies

See `pyproject.toml`. Main libraries: `altair`, `pandas`, `geopandas`, `ipywidgets`, `jupyter`.
