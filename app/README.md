# Baby Names — Web App

![French Baby Names Explorer — dashboard preview](images/after-dashboard.png)

Interactive JavaScript app with the **3 visualizations** shipped in this repo (see [Design rationale](#design-rationale) for how they replaced the first notebook iteration).

| Section          | Visualization                                        |
| ---------------- | ---------------------------------------------------- |
| **1 — Temporal** | 1.6 Ranked area bump streams — top 20 (D3)           |
| **2 — Regional** | 2.1 Choropleth + 2.9 Regional compass (D3 + GeoJSON) |
| **3 — Gender**   | 3.8 Gender trajectories — 25 names, 5 bands (D3)     |

## Design rationale

Our **first three chart choices** — prototyped in [`notebooks/baby_names_3_implementation.ipynb`](../notebooks/baby_names_3_implementation.ipynb) — had a problem: after a critical review, we identified a high risk of **chartjunk** (visual elements that add complexity without adding information). After rethinking over the weekend, we settled on three more rigorous visualizations (implemented in this web app).

| Dimension | First iteration (`baby_names_3_implementation.ipynb`) | Current app |
| --------- | ----------------------------------------------------- | ----------- |
| **Temporal** | 1.6 *Popularity vines* (botanical metaphor) | Ranked area bump streams |
| **Regional** | 2.1 Choropleth + 2.9 *Regional compass* | Same pairing (refined scales & layout) |
| **Gender** | 3.3 *Boys vs girls per name* (silhouette icons) | Gender ratio trajectories |

## Before & after

<table>
  <tr>
    <th align="center" width="48%">Before — <code>baby_names_3_implementation.ipynb</code></th>
    <th align="center" width="52%">After — this web app</th>
  </tr>
  <tr>
    <td valign="top">
      <p><strong>1 — Temporal</strong> · <em>Popularity vines</em></p>
      <img src="images/before-temporal-vines.png" alt="Before: popularity vines" width="100%" />
      <p><strong>2 — Regional</strong> · choropleth + compass</p>
      <img src="images/before-regional-map.png" alt="Before: department map and regional compass" width="100%" />
      <p><strong>3 — Gender</strong> · <em>Boys vs girls</em> silhouettes</p>
      <img src="images/before-gender-silhouettes.png" alt="Before: boys vs girls silhouettes" width="100%" />
    </td>
    <td valign="top">
      <p><strong>Area bump streams</strong> · <strong>map + compass</strong> · <strong>gender trajectories</strong></p>
      <img src="images/after-dashboard.png" alt="After: dashboard" width="100%" />
    </td>
  </tr>
</table>

### Ranked popularity streams (area bump chart)

What makes this chart compelling is its ability to encode both **rank** and **volume** at the same time, so that a century of naming trends becomes readable in a single glance. The stream crossings naturally draw the eye to the moments where popularity shifted. The only problem is that when too many crossings overlap, following a specific name through the chart requires some effort.

### Department map & regional compass (choropleth + compass)

The strength of this pairing is that it offers two levels of reading without duplicating the data: departmental detail on the left, macro-regional synthesis on the right. The main limitation we noticed is that the color scale tends to flatten subtle differences in rates, and the compass rays become almost invisible when values are near zero.

### Gender ratio trajectories

This view is particularly interesting because it captures something that a simple bar chart cannot: the names that gradually shifted from one gender to the other over decades. The 5×5 grid keeps the comparison structured without becoming overwhelming. The main difficulty is that 25 simultaneous trajectories inevitably create some label overlap at the endpoints, which can make the chart harder to read at first.

These three views cover the three core dimensions of the dataset — **time**, **space**, and **gender** — with minimal visual noise and maximum useful encoding, while avoiding chartjunk.

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

Open the URL shown in the terminal (default [http://localhost:5173](http://localhost:5173)).

## Stack

- [Vite](https://vitejs.dev/) — dev server and bundler
- [D3.js](https://d3js.org/) (CDN ESM) — streamgraph, map, compass, gender trajectories

## Controls

- **Ranked streams**: sex, start decade, click a stream or sidebar name to highlight
- **Regional**: name (top 20), decade
- **Gender trajectories**: reference decade (5×5 selection), band filter, highlight a name

