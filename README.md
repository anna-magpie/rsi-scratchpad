# RSI Scratchpad

Vibecoded ideas and experiments for understanding recursive self-improvement, organised around the seven links of the risk argument. It's a plain Jekyll site built by GitHub Pages, with no theme or plugins.

## Add an entry

Create `_posts/YYYY-MM-DD-slug.md`, or `.html` for an interactive experiment:

```yaml
---
title: My new idea
kind: post          # post | experiment
questions: [2, 4]   # which links (1–7) it bears on
summary: One line shown in listings.
---
```

Commit and push to `main`. Pages rebuilds in about a minute.

## Rate a link

Each link lives in `_questions/`. Write the evidence in the body as Markdown, and add a support badge to the front matter:

```yaml
status: Best-supported link
status_class: strong   # strong | moderate | open | weak | crux (sets the colour)
```

## Layout

| Path | What |
|---|---|
| `_questions/` | One page per link: evidence summary, plus every entry tagged with it |
| `_posts/` | Posts and experiments |
| `assets/js/viz.js` | `Viz.line()` / `Viz.bars()`: theme-aware SVG charts with hover tooltips |
| `assets/css/style.css` | All styles; light and dark tokens at the top |

## Preview locally (optional)

```sh
gem install bundler jekyll
jekyll serve --baseurl /rsi-scratchpad
```
