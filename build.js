#!/usr/bin/env node
/**
 * Red Rugger LLC — static site builder
 * ------------------------------------
 * Assembles pages from src/partials + src/pages into dist/.
 * No dependencies. Run:  node build.js
 *
 * Each file in src/pages/ begins with a JSON front-matter block fenced by
 * <!--meta ... meta-->. Everything after it is the page body.
 *
 *   <!--meta
 *   { "slug": "index", "title": "...", "description": "...", "nav": "home" }
 *   meta-->
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const PAGES = path.join(SRC, 'pages');
const PARTIALS = path.join(SRC, 'partials');
const DIST = path.join(__dirname, 'dist');

const SITE = {
  name: 'Red Rugger LLC',
  url: 'https://www.redruggerllc.com',
  phone: '475-299-8238',
  phoneHref: 'tel:+14752998238',
  email: 'info@redruggerllc.com',
  city: 'Boynton Beach, FL 33436',
  year: new Date().getFullYear(),
};

const read = (p) => fs.readFileSync(p, 'utf8');

function parsePage(raw) {
  const m = raw.match(/<!--meta([\s\S]*?)meta-->/);
  if (!m) throw new Error('Page is missing its <!--meta ... meta--> block.');
  const meta = JSON.parse(m[1].trim());
  const body = raw.slice(m.index + m[0].length).trim();
  return { meta, body };
}

/** Replace {{token}} with values from the context. Unknown tokens are left alone. */
function fill(tpl, ctx) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key) => {
    const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx);
    return val == null ? whole : String(val);
  });
}

/** Mark the active top-level nav item so the header can highlight it. */
function markActiveNav(headerHtml, navKey) {
  if (!navKey) return headerHtml;
  return headerHtml.replace(
    new RegExp(`(<(?:a|button)[^>]*data-nav="${navKey}"[^>]*)(>)`, 'g'),
    '$1 aria-current="page"$2'
  );
}

function build() {
  const shell = read(path.join(PARTIALS, 'shell.html'));
  const header = read(path.join(PARTIALS, 'header.html'));
  const footer = read(path.join(PARTIALS, 'footer.html'));

  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

  const files = fs.readdirSync(PAGES).filter((f) => f.endsWith('.html'));
  const built = [];

  for (const file of files) {
    const { meta, body } = parsePage(read(path.join(PAGES, file)));
    const ctx = { ...SITE, ...meta, site: SITE };

    const html = fill(shell, {
      ...ctx,
      header: markActiveNav(fill(header, ctx), meta.nav),
      footer: fill(footer, ctx),
      body: fill(body, ctx),
      bodyClass: meta.bodyClass || '',
      schema: meta.schema ? `\n<script type="application/ld+json">${JSON.stringify(meta.schema)}</script>` : '',
    });

    const out = path.join(DIST, `${meta.slug}.html`);
    fs.writeFileSync(out, html, 'utf8');
    built.push(`${meta.slug}.html`);
  }

  // sitemap.xml — every built page, so search engines find the new fund pages.
  const urls = built
    .map((f) => {
      const loc = f === 'index.html' ? `${SITE.url}/` : `${SITE.url}/${f.replace('.html', '/')}`;
      const priority = f === 'index.html' ? '1.0' : f.startsWith('multifamily') || f.startsWith('invest') ? '0.9' : '0.7';
      return `  <url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
    })
    .join('\n');
  fs.writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`,
    'utf8'
  );

  console.log(`Built ${built.length} pages:\n  ${built.join('\n  ')}\n  sitemap.xml\n  robots.txt`);
}

build();
