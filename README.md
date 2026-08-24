# Red Rugger LLC — website

A rebuild of [redruggerllc.com](https://www.redruggerllc.com/) with a new multifamily investing layer.

Static, dependency-free: 13 pages, one stylesheet, one script, no framework. **10.5KB of CSS and 3.8KB of JS gzipped.**

- **Strategy, ICP research and section-by-section conversion rationale:** [STRATEGY.md](STRATEGY.md)
- **Live preview:** enabled via GitHub Pages — see [Preview deployment](#preview-deployment)

> [!IMPORTANT]
> **This is a review build, not a production release.** The legal pages are unreviewed drafts, the return figures on the Multifamily page have not been through counsel, and the contact forms are not yet connected to anything. See [Before this goes live](#before-this-goes-live). The preview is blocked from search engines on purpose.

---

## Quick start

```bash
node build.js
```

Assembles `src/` into `dist/`. Then preview locally:

```bash
node tools/serve.js 4400
```

Open <http://localhost:4400>. `dist/` is the entire deployable site — it works on any static host (Netlify, Vercel, Cloudflare Pages, S3, GitHub Pages).

---

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Home — full-bleed video/photo hero, three service paths, thesis, benefits, process, FAQ |
| `multifamily.html` | Multifamily investing — target returns, the thesis, the buy box, how value is created |
| `invest.html` | Partner With Us — the four ways to work with the firm, comparison table, enquiry form |
| `lending.html` | Private money lending — three loan programs, pre-qualification form |
| `fix-flip-buy-hold.html` | Fix & flip and buy & hold services, plus loan brokerage |
| `sell.html` | Sell your house — any condition, no fees, offer form |
| `about.html` | Founder, mission, the four service lines |
| `faq.html` | Investing / borrowing / selling, with FAQPage structured data |
| `contact.html` | Direct channels first, then a routed contact form |
| `thank-you.html` | Conversion confirmation — the analytics goal destination |
| `disclosures.html` · `privacy.html` · `terms.html` | Legal (drafts) |

Navigation: **Partner With Us ▾** · Sell Your House · About · Contact.

---

## Project layout

```
build.js              Assembles pages. Site-wide values (phone, email, address)
                      live in the SITE object at the top.
src/
  partials/           shell (head/meta), header (nav), footer (CTA + disclosure)
  pages/*.html        One file per page: a JSON meta block, then the body
dist/                 BUILT OUTPUT — this is what deploys. Do not hand-edit the HTML.
  assets/css|js|img|video
assets-src/           Original full-resolution photos and video masters
tools/
  make-art.js         Regenerates the SVG elevation drawings
  serve.js            Local preview server
  audit.js            Links, alt text, headings, ids, meta, placeholder check
```

**Edit `src/`, never `dist/*.html`** — those are regenerated on every build. The CSS and JS in `dist/assets/` *are* the source and are edited directly.

### Adding a page

Create `src/pages/whatever.html`:

```html
<!--meta
{
  "slug": "whatever",
  "canonical": "whatever/",
  "nav": "invest",
  "title": "Page title, 60 characters or fewer",
  "description": "Meta description, 70 to 160 characters."
}
meta-->

<section class="section">
  <div class="wrap"> ... </div>
</section>
```

Run `node build.js`. It appears in `sitemap.xml` automatically.

Tokens available anywhere: `{{phone}}`, `{{phoneHref}}`, `{{email}}`, `{{city}}`, `{{year}}`, `{{url}}`.

---

## Preview deployment

Pushing to `main` runs [`.github/workflows/deploy-preview.yml`](.github/workflows/deploy-preview.yml), which builds the site, runs the audit, and publishes `dist/` to GitHub Pages.

**Enable it once:** repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The workflow deliberately blocks indexing on the deployed copy — it swaps in a `Disallow: /` robots.txt, deletes the sitemap, and injects `<meta name="robots" content="noindex, nofollow">` into every page. The committed `dist/` stays production-correct; only the preview is suppressed.

---

## Design system

| Token | Value | Role |
|---|---|---|
| Ink | `#0B0B0C` | Sampled from the logo — structure |
| Graphite | `#17181A` | Raised surface on dark |
| Limestone | `#F3F1ED` | Page ground |
| Bone | `#FAF9F7` | Cards |
| Plaster | `#E7E3DC` | Muted band |
| **Rugger Red** | `#C61111` | Sampled from the logo. Signal only |
| Ember | `#EE4034` | Red for dark surfaces (AA on graphite and ink) |
| Slate | `#625F59` | Secondary text |

**Type:** Newsreader (display) · Archivo (body/UI) · IBM Plex Mono (data, labels, eyebrows).

**Signature:** the logo is six bars of varying height. That becomes the eyebrow marker before every section heading, and the favicon.

**Motion:** `transform` and `opacity` only, strong `ease-out` `cubic-bezier(0.23, 1, 0.32, 1)`, UI transitions under 300ms, hover gated behind `(hover: hover) and (pointer: fine)`, and `prefers-reduced-motion` removes every position change while keeping fades. Background videos never download on phones or under reduced motion — those get the poster still.

---

## Before this goes live

### 1. Connect the forms — nothing is captured today

All four forms validate and show a success message, but send nothing. Add one attribute:

```html
<form class="form" data-form data-endpoint="https://formspree.io/f/YOUR_ID" novalidate>
```

Any handler that accepts a plain form POST works (Formspree, Basin, Netlify Forms, your own). Forms needing endpoints: `invest`, `lending`, `sell`, `contact`. **Route them to different inboxes** — an investor enquiry and a distressed seller need very different response times. Then send a real test through each one.

### 2. Legal review — required

`disclosures.html`, `privacy.html` and `terms.html` are drafts written to the standard a private real estate operator is normally held to. They are **not legal advice and have not been reviewed by counsel.** Each carries a visible "Draft pending legal review" callout; remove it once reviewed.

Settle with counsel: the site invites private investors into deals the firm operates and publishes target returns. Depending on structure those arrangements may constitute securities. Confirm which exemption is being relied on and amend the disclosures to match.

### 3. Substantiate the return figures

`multifamily.html` publishes 15–20% target annualized return, 7–10% target cash-on-cash, and a 1.8–2.2× target equity multiple, supplied by the client. They are labeled as targets with a disclaimer beneath. Confirm every figure, and add the underwriting basis — unevidenced targets read as a negative signal to sophisticated investors.

### 4. Analytics and conversion tracking

None installed. Add the tag in `src/partials/shell.html` before `</head>`, set `thank-you.html` as the goal, and track separately: investor enquiry, pre-qualification, offer request, and `tel:` clicks.

### 5. Outstanding content

- **Founder bio** — currently two sentences. The highest-value copy on the site.
- **Social proof** — no testimonials, cases or references anywhere.
- **OG share image** — `assets/img/og-card.png` is referenced but does not exist, so link previews render blank.
- **Private Lending page head** — still has no background image.

---

## Checks

```bash
node tools/audit.js
```

Fails on broken internal links, missing assets, duplicate ids, missing alt text, heading-level skips, unresolved `{{tokens}}` and missing head tags. Also reports title/description lengths and remaining placeholders. It runs in CI on every push.

Verified in-browser: WCAG AA contrast across all pages in both masthead states, no horizontal overflow at 375 / 768 / 1280, and correct keyboard and ARIA behavior for the nav dropdown, mobile drawer, accordions and forms.

---

## Content preserved from the original site

Every service description, all eight original FAQ answers, the mission statement, the founder attribution and the contact details were carried across. The seller content — which previously existed only inside the FAQ — was given its own page at `sell.html`.

| Original | Now |
|---|---|
| Home | `index.html` |
| About Us | `about.html` |
| Services | `fix-flip-buy-hold.html` + `lending.html` |
| Private Money Lender | `lending.html` |
| Investors | `invest.html` + `multifamily.html` |
| FAQ | `faq.html` (all eight seller answers preserved) |
| Contact Us | `contact.html` |

Each page's `canonical` still points at the original live URL, so existing search equity transfers on cutover.
