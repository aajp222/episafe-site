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
- `cms.js` — pulls live, published content into `team.html` / `news.html` (falls back to static content if the backend is offline)
- `images/` — legacy assets still referenced by the legal pages
- `tests/` — pytest tests validating the HTML files
- `worker/` — the admin backend: log in to edit team profiles, news, and open roles (Cloudflare Worker + D1). See `worker/README.md`

## Admin / backend

`worker/` contains a serverless backend + control panel at `episafe.co/admin`
where the team can log in and edit content. Admins edit everything; employees
edit their own team profile. It does not affect the public site until deployed.
See **`worker/README.md`** for local preview and go-live steps.

## Running Tests

```bash
pip install pytest beautifulsoup4
pytest
```
