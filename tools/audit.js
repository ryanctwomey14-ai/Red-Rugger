#!/usr/bin/env node
/**
 * Static audit of dist/: broken internal links, missing assets, heading
 * order, images without alt text, duplicate ids, and leftover placeholders.
 * Run: node tools/audit.js
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const pages = fs.readdirSync(DIST).filter((f) => f.endsWith('.html'));
const problems = [];
const notes = [];

const exists = (rel) => fs.existsSync(path.join(DIST, rel.split('#')[0].split('?')[0]));

for (const page of pages) {
  const raw = fs.readFileSync(path.join(DIST, page), 'utf8');
  // Strip comments before link/asset checks — commented-out markup (e.g. the
  // hero video slot) is documentation, not a broken reference.
  const html = raw.replace(/<!--[\s\S]*?-->/g, '');
  const at = (msg) => problems.push(`${page}: ${msg}`);

  // --- internal links -----------------------------------------------------
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (/^(https?:|mailto:|tel:|#|data:)/.test(href)) continue;
    if (!exists(href)) at(`broken link -> ${href}`);
  }

  // --- assets -------------------------------------------------------------
  for (const m of html.matchAll(/(?:src|content)="((?:assets|\.\/assets)[^"]+)"/g)) {
    if (!exists(m[1])) at(`missing asset -> ${m[1]}`);
  }

  // --- anchors referenced on this page ------------------------------------
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) at(`duplicate id(s): ${[...new Set(dupes)].join(', ')}`);
  for (const href of hrefs) {
    if (href.startsWith('#') && href.length > 1 && !ids.includes(href.slice(1))) {
      at(`anchor not found -> ${href}`);
    }
    const [file, hash] = href.split('#');
    if (hash && file && file.endsWith('.html') && exists(file)) {
      const target = fs.readFileSync(path.join(DIST, file), 'utf8');
      if (!target.includes(`id="${hash}"`)) at(`cross-page anchor not found -> ${href}`);
    }
  }

  // --- images need alt ----------------------------------------------------
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(m[0])) at(`<img> without alt: ${m[0].slice(0, 90)}`);
  }

  // --- heading order ------------------------------------------------------
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  const h1s = levels.filter((l) => l === 1).length;
  if (h1s !== 1) at(`expected exactly one <h1>, found ${h1s}`);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      at(`heading level jumps h${levels[i - 1]} -> h${levels[i]}`);
      break;
    }
  }

  // --- required head tags -------------------------------------------------
  for (const tag of ['<title>', 'name="description"', 'rel="canonical"', 'lang="en"']) {
    if (!html.includes(tag)) at(`missing ${tag}`);
  }
  const desc = html.match(/name="description" content="([^"]*)"/);
  if (desc && (desc[1].length < 70 || desc[1].length > 165)) {
    notes.push(`${page}: meta description is ${desc[1].length} chars (aim 70-160)`);
  }
  const title = html.match(/<title>([^<]*)<\/title>/);
  if (title && title[1].length > 65) notes.push(`${page}: title is ${title[1].length} chars (aim <= 60)`);

  // --- unresolved template tokens ----------------------------------------
  const leftovers = [...html.matchAll(/\{\{[^}]+\}\}/g)].map((m) => m[0]);
  if (leftovers.length) at(`unresolved token(s): ${[...new Set(leftovers)].join(', ')}`);

  // --- content that must be replaced before launch ------------------------
  const phCount = (html.match(/class="[^"]*\bph\b[^"]*"/g) || []).length;
  const phComments = (raw.match(/PLACEHOLDER|PHOTO SLOT|DRAFT FOR ATTORNEY|VIDEO SLOT/g) || []).length;
  if (phCount || phComments) notes.push(`${page}: ${phCount} placeholder value(s), ${phComments} slot/draft marker(s)`);
}

console.log(`Audited ${pages.length} pages.\n`);
if (problems.length) {
  console.log('PROBLEMS');
  problems.forEach((p) => console.log('  x ' + p));
} else {
  console.log('No broken links, missing assets, alt-text gaps, duplicate ids or heading-order issues.');
}
if (notes.length) {
  console.log('\nPRE-LAUNCH NOTES');
  notes.forEach((n) => console.log('  - ' + n));
}
process.exit(problems.length ? 1 : 0);
