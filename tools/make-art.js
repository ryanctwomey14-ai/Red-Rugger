#!/usr/bin/env node
/**
 * Generates the site's SVG artwork.
 * Run: node tools/make-art.js
 *
 * The house style is an architect's elevation drawing: hairline ink on
 * limestone, dimension ticks, and a handful of units lit in brand red.
 * Everything is deterministic so rebuilds don't reshuffle the facades.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'dist', 'assets', 'img');
const C = { ink: '#0B0B0C', line: '#0B0B0C', red: '#C61111', bone: '#F3F1ED', slate: '#625F59' };
// Blueprint colorway: the same drawing reversed onto ink, for the hero panel.
const LIGHT = C;
const D = { ink: '#F3F1ED', line: '#F3F1ED', red: '#EE4034', bone: '#0B0B0C', slate: '#8A867E' };

/** Deterministic PRNG so the same seed always draws the same building. */
function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * One multifamily elevation.
 * @param {object} o  seed, width, height, floors, bays, litRatio, label
 */
function elevation(o) {
  const C = o.dark ? D : LIGHT;
  const w = o.width, h = o.height;
  const rand = rng(o.seed);
  const pad = { l: 46, r: 46, t: 34, b: 52 };
  const bw = w - pad.l - pad.r;          // building width
  const bh = h - pad.t - pad.b;          // building height
  const floors = o.floors, bays = o.bays;
  const floorH = bh / floors;
  const bayW = bw / bays;

  const parts = [];
  const push = (s) => parts.push(s);

  // ---- Sheet grid: faint drafting graph behind everything -----------------
  push(`<g stroke="${C.slate}" stroke-width="0.5" opacity="${o.dark ? 0.16 : 0.13}">`);
  for (let x = 0; x <= w; x += 24) push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  for (let y = 0; y <= h; y += 24) push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  push(`</g>`);

  // ---- Ground line --------------------------------------------------------
  const groundY = pad.t + bh;
  push(`<line x1="8" y1="${groundY}" x2="${w - 8}" y2="${groundY}" stroke="${C.ink}" stroke-width="1.4"/>`);
  push(`<g stroke="${C.slate}" stroke-width="0.8" opacity="0.5">`);
  for (let x = 10; x < w - 10; x += 9) push(`<line x1="${x}" y1="${groundY}" x2="${x - 6}" y2="${groundY + 7}"/>`);
  push(`</g>`);

  // ---- Building mass ------------------------------------------------------
  push(`<rect x="${pad.l}" y="${pad.t}" width="${bw}" height="${bh}" fill="${o.dark ? '#101113' : C.bone}" stroke="${C.ink}" stroke-width="1.4"/>`);

  // Parapet cap — the silhouette nod to the logo's stepped crown
  const capH = 9;
  push(`<rect x="${pad.l - 7}" y="${pad.t - capH}" width="${bw + 14}" height="${capH}" fill="${C.ink}"/>`);

  // ---- Floor lines --------------------------------------------------------
  push(`<g stroke="${C.ink}" stroke-width="0.7" opacity="0.42">`);
  for (let f = 1; f < floors; f++) {
    const y = pad.t + f * floorH;
    push(`<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${pad.l + bw}" y2="${y.toFixed(1)}"/>`);
  }
  push(`</g>`);

  // ---- Windows ------------------------------------------------------------
  const wInset = bayW * 0.24, hInset = floorH * 0.26;
  const winW = bayW - wInset * 2, winH = floorH - hInset * 2;
  const lit = [];
  push(`<g>`);
  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const x = pad.l + b * bayW + wInset;
      const y = pad.t + f * floorH + hInset;
      const isGround = f === floors - 1;
      const r = rand();
      let fill = 'none', stroke = C.ink, sw = 0.9, op = 1;

      if (isGround && o.retail !== false) {
        // Ground floor reads as taller glazing — lobby / amenity
        push(`<rect x="${(pad.l + b * bayW + bayW * 0.12).toFixed(1)}" y="${y.toFixed(1)}" width="${(bayW * 0.76).toFixed(1)}" height="${winH.toFixed(1)}" fill="${C.ink}" opacity="0.08" stroke="${C.ink}" stroke-width="0.9"/>`);
        continue;
      }
      if (r < o.litRatio) { fill = C.red; stroke = C.red; lit.push([x, y]); }
      else if (r < o.litRatio + 0.22) { fill = C.ink; op = 0.82; }
      else { fill = C.ink; op = o.dark ? 0.12 : 0.07; }

      push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${winW.toFixed(1)}" height="${winH.toFixed(1)}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="${sw}" stroke-opacity="0.55"/>`);
      // Mullion
      push(`<line x1="${(x + winW / 2).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + winW / 2).toFixed(1)}" y2="${(y + winH).toFixed(1)}" stroke="${fill === C.red ? C.bone : C.ink}" stroke-width="0.6" stroke-opacity="0.45"/>`);
    }
  }
  push(`</g>`);

  // ---- Dimension line down the left edge ----------------------------------
  const dx = pad.l - 22;
  push(`<g stroke="${C.slate}" stroke-width="0.8" opacity="0.75">`);
  push(`<line x1="${dx}" y1="${pad.t}" x2="${dx}" y2="${groundY}"/>`);
  push(`<line x1="${dx - 4}" y1="${pad.t}" x2="${dx + 4}" y2="${pad.t}"/>`);
  push(`<line x1="${dx - 4}" y1="${groundY}" x2="${dx + 4}" y2="${groundY}"/>`);
  push(`</g>`);
  push(`<text x="${dx - 8}" y="${(pad.t + bh / 2).toFixed(1)}" transform="rotate(-90 ${dx - 8} ${(pad.t + bh / 2).toFixed(1)})" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8" letter-spacing="1.6" fill="${C.slate}">${floors} STORIES</text>`);

  // ---- Bay ticks along the base -------------------------------------------
  push(`<g stroke="${C.slate}" stroke-width="0.8" opacity="0.6">`);
  for (let b = 0; b <= bays; b++) {
    const x = pad.l + b * bayW;
    push(`<line x1="${x.toFixed(1)}" y1="${groundY + 12}" x2="${x.toFixed(1)}" y2="${groundY + 18}"/>`);
  }
  push(`<line x1="${pad.l}" y1="${groundY + 15}" x2="${pad.l + bw}" y2="${groundY + 15}"/>`);
  push(`</g>`);

  // ---- Sheet label --------------------------------------------------------
  if (o.label) {
    push(`<text x="${pad.l}" y="${h - 12}" font-family="IBM Plex Mono, monospace" font-size="8.5" letter-spacing="1.8" fill="${C.slate}">${o.label}</text>`);
  }
  push(`<text x="${w - pad.r}" y="${h - 12}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="8.5" letter-spacing="1.8" fill="${C.red}">${lit.length} UNITS LIT</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${o.alt}">
<rect width="${w}" height="${h}" fill="${C.bone}"/>
${parts.join('\n')}
</svg>`;
}

/* -------------------------------------------------------------------------- */

const art = {
  'hero-elevation-dark.svg': elevation({
    seed: 7, width: 720, height: 760, floors: 8, bays: 9, litRatio: 0.15, dark: true,
    label: 'ELEVATION / NORTH', alt: 'Blueprint-style elevation drawing of an eight-storey apartment building with lit units',
  }),
  'hero-elevation.svg': elevation({
    seed: 7, width: 640, height: 620, floors: 7, bays: 9, litRatio: 0.14,
    label: 'ELEVATION / NORTH', alt: 'Architectural elevation drawing of a seven-story apartment building',
  }),
  'elevation-b-dark.svg': elevation({
    seed: 42, width: 640, height: 460, floors: 5, bays: 11, litRatio: 0.13, dark: true,
    label: 'ELEVATION / GARDEN-STYLE', alt: 'Blueprint-style elevation of a five-storey garden-style apartment building',
  }),
  'elevation-c-dark.svg': elevation({
    seed: 1988, width: 640, height: 480, floors: 6, bays: 7, litRatio: 0.18, dark: true,
    label: 'ELEVATION / MID-RISE', alt: 'Blueprint-style elevation of a six-storey mid-rise apartment building',
  }),
  'elevation-d-dark.svg': elevation({
    seed: 305, width: 640, height: 400, floors: 3, bays: 12, litRatio: 0.11, dark: true,
    label: 'ELEVATION / WORKFORCE', alt: 'Blueprint-style elevation of a three-storey workforce housing building',
  }),
  'elevation-b.svg': elevation({
    seed: 42, width: 640, height: 460, floors: 5, bays: 11, litRatio: 0.12,
    label: 'ELEVATION / GARDEN-STYLE', alt: 'Architectural elevation drawing of a five-story garden-style apartment building',
  }),
  'elevation-c.svg': elevation({
    seed: 1988, width: 640, height: 480, floors: 6, bays: 7, litRatio: 0.17,
    label: 'ELEVATION / MID-RISE', alt: 'Architectural elevation drawing of a six-story mid-rise apartment building',
  }),
  'elevation-d.svg': elevation({
    seed: 305, width: 640, height: 400, floors: 3, bays: 12, litRatio: 0.1,
    label: 'ELEVATION / WORKFORCE', alt: 'Architectural elevation drawing of a three-story workforce housing building',
  }),
};

/* Favicon — the logo's six bars, reduced to their essentials. */
art['favicon.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" fill="#0B0B0C"/>
<g fill="#C61111">
<rect x="5"  y="14" width="3" height="12"/>
<rect x="9.5" y="10" width="3" height="16"/>
<rect x="14" y="6"  width="4" height="20"/>
<rect x="19.5" y="10" width="3" height="16"/>
<rect x="24" y="14" width="3" height="12"/>
</g>
<rect x="5" y="26" width="22" height="3" fill="#F3F1ED"/>
</svg>`;

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
Object.entries(art).forEach(([name, svg]) => {
  fs.writeFileSync(path.join(OUT, name), svg, 'utf8');
  console.log('wrote', name);
});
