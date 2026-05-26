# EpiSafe Static Site

Static HTML for the EpiSafe website, a liquid-glass design system in black, orange, and white.

## Pages

- `index.html` — Home: hero, problem, how it works, app, market, team, CTA
- `product.html` — Product detail: callouts, three-step usage, specs, old vs new
- `story.html` — Narrative: question, chapters, manifesto, team bios, moments
- `traction.html` — Investor: metrics, roadmap, IP, market, use of funds, ask
- `privacy.html`, `terms.html`, `accessibility.html` — Legal pages

## Structure

- `assets/` — images, fonts (Paul Grotesk), and favicon used by the new design
- `styles.css` — shared design system (glass primitives, tokens, nav, footer, mobile)
- `site.js` — shared behavior (reveal-on-scroll, count-up, mobile menu, tilt)
- `images/` — legacy assets still referenced by the legal pages
- `tests/` — pytest tests validating the HTML files

## Running Tests

```bash
pip install pytest beautifulsoup4
pytest
```
