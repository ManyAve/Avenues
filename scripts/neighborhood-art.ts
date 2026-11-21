/**
 * ManyAve's neighborhood illustration (AVE-217): the manyave.com hero scene, a street of houses, neighbors and party
 * lights under a sky with clouds, a balloon and a kite; late afternoon in light, dusk with lit windows in dark. It is
 * ManyAve's own artwork, drawn from code, so every app takes the same picture from Avenue instead of keeping a copy.
 *
 * The drawing is copied from manyave-management's scripts/generate-marketing-scene.ts (where it started, for the
 * marketing hero) and the street crop and phone backdrop from manyave-neighbors' scripts/neighborhood-art.ts
 * (NEI-348). Avenue never imports from an app, so the code lives here now and the apps read its output.
 *
 *   bun run art:neighborhood             writes art/neighborhood/ (the SVGs and sky.css)
 *   bun run art:neighborhood --backdrops also renders the phone backdrops to native/art/ in Chromium
 *
 * Deterministic: the same seed draws the same street, so `test:scripts` fails when a committed file is stale.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

const W = 1600;
const H = 1150;
// Units above this line show between the hero text and the screenshot; the middle of it sits under the
// "Free for 60 days" note, so the center stays low and the tall things go to the sides.
const CENTER_FROM = 330;
const CENTER_TO = 1270;

export type Palette = {
  hillFar: string;
  hillMid: string;
  walls: string[];
  roofs: string[];
  trim: string;
  window: string;
  windowLit: string;
  door: string;
  trees: string[];
  trunk: string;
  lawn: string;
  lawnNear: string;
  sidewalk: string;
  street: string;
  streetLine: string;
  lamp: string;
  lampGlow: string;
  bulb: string;
  wire: string;
  people: string[];
  skin: string[];
  hedge: string;
  fence: string;
  flowers: string[];
  dark: boolean;
};

export const light: Palette = {
  hillFar: "#cfd8c6",
  hillMid: "#b4c4a8",
  walls: ["#efe4d2", "#e3d5c0", "#dfe3d6", "#e8dccd", "#d9dfe6"],
  roofs: ["#6f8570", "#8a6e5d", "#4e3d70", "#7788a2", "#5d6f5e"],
  trim: "#fbf8f1",
  window: "#c9d6dc",
  windowLit: "#f4e6bf",
  door: "#4e3d70",
  trees: ["#8ea68b", "#78966f", "#a1b694", "#6a8a66"],
  trunk: "#7a6552",
  lawn: "#a9bd98",
  lawnNear: "#98af88",
  sidewalk: "#e6dfd0",
  street: "#c9c6bb",
  streetLine: "#f3efe4",
  lamp: "#4f5a51",
  lampGlow: "#fff3cf",
  bulb: "#fff1c4",
  wire: "#5d6a5f",
  people: ["#4e3d70", "#c9785a", "#2f5a44", "#7788a2", "#d6a54a"],
  skin: ["#e6b99a", "#b98466", "#8a5d43", "#f0caa8"],
  hedge: "#7d9a72",
  fence: "#fbf8f1",
  flowers: ["#e59a8c", "#f2cf72", "#c9b8f0", "#ffffff"],
  dark: false,
};

export const dark: Palette = {
  hillFar: "#1f2b2b",
  hillMid: "#19241f",
  walls: ["#26302d", "#2a2f33", "#232c28", "#2c2b31", "#212a2c"],
  roofs: ["#151c1a", "#1b1a22", "#2a2140", "#18202a", "#141b17"],
  trim: "#38423d",
  window: "#2f3a40",
  windowLit: "#f6c978",
  door: "#2a2140",
  trees: ["#18251f", "#1c2b22", "#15211b", "#203026"],
  trunk: "#1a1714",
  lawn: "#16201b",
  lawnNear: "#131c17",
  sidewalk: "#2a2f2b",
  street: "#1d2120",
  streetLine: "#4a4f47",
  lamp: "#3a3f3b",
  lampGlow: "#ffd58a",
  bulb: "#ffd98f",
  wire: "#0e1311",
  people: ["#5a4a82", "#8a5a48", "#3a6b52", "#55657e", "#9a7a3a"],
  skin: ["#a88470", "#8a6450", "#6a4a38", "#b8957c"],
  hedge: "#18251d",
  fence: "#3a433e",
  flowers: ["#b06a60", "#c9a050", "#8f80b8", "#c9c4b8"],
  dark: true,
};

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;
const pick = <T>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)]!;
const inCenter = (x: number) => x > CENTER_FROM && x < CENTER_TO;

function hills(p: Palette) {
  const far = `M0 ${H} L0 120 C 180 70 320 96 470 118 C 620 140 700 112 800 108 C 900 104 1000 136 1130 122 C 1280 106 1420 64 1600 104 L1600 ${H} Z`;
  const mid = `M0 ${H} L0 170 C 200 130 360 150 520 158 C 700 168 900 150 1080 160 C 1260 170 1420 128 1600 150 L1600 ${H} Z`;
  return `<path d="${far}" fill="${p.hillFar}"/><path d="${mid}" fill="${p.hillMid}"/>`;
}

function tree(r: () => number, p: Palette, x: number, baseY: number, top: number) {
  const color = pick(r, p.trees);
  const h = baseY - top;
  const rad = Math.max(22, h * 0.34);
  const trunkTop = top + rad * 1.4;
  let s = `<rect x="${f(x - 4)}" y="${f(trunkTop)}" width="8" height="${f(baseY - trunkTop)}" rx="3" fill="${p.trunk}"/>`;
  const blobs = [
    [0, top + rad, rad],
    [-rad * 0.62, top + rad * 1.45, rad * 0.78],
    [rad * 0.6, top + rad * 1.4, rad * 0.82],
    [0, top + rad * 1.75, rad * 0.7],
  ];
  for (const [dx, cy, rr] of blobs) s += `<circle cx="${f(x + dx!)}" cy="${f(cy!)}" r="${f(rr!)}" fill="${color}"/>`;
  // A lighter cap gives the crown a sunlit side.
  s += `<circle cx="${f(x - rad * 0.25)}" cy="${f(top + rad * 0.85)}" r="${f(rad * 0.55)}" fill="#ffffff" opacity="${p.dark ? 0.03 : 0.12}"/>`;
  return s;
}

type Roof = { x: number; w: number; peak: number; eave: number };

function house(
  r: () => number,
  p: Palette,
  x: number,
  w: number,
  peak: number,
  base: number,
  glow: string[],
  smoke: string[],
  roofs: Roof[],
) {
  const wall = pick(r, p.walls);
  const roof = pick(r, p.roofs);
  const roofH = w * (0.34 + r() * 0.12);
  const eave = peak + roofH;
  let s = "";
  if (r() < 0.55) {
    const cx = x + w * (r() < 0.5 ? 0.22 : 0.72);
    s += `<rect x="${f(cx)}" y="${f(peak + roofH * 0.2)}" width="14" height="${f(roofH * 0.6)}" fill="${roof}"/>`;
    s += `<rect x="${f(cx - 2)}" y="${f(peak + roofH * 0.2 - 4)}" width="18" height="5" fill="${p.trim}" opacity="0.6"/>`;
    // A curl of chimney smoke, kept off the middle where it would climb into the hero's note.
    if (!inCenter(cx)) {
      const top = peak + roofH * 0.2 - 8;
      const c = p.dark ? "#56605c" : "#ffffff";
      smoke.push(
        `<g class="smoke" fill="${c}"><circle cx="${f(cx + 8)}" cy="${f(top - 6)}" r="7" opacity="0.5"/><circle cx="${f(cx + 16)}" cy="${f(top - 22)}" r="9" opacity="0.38"/><circle cx="${f(cx + 10)}" cy="${f(top - 42)}" r="11" opacity="0.26"/><circle cx="${f(cx + 22)}" cy="${f(top - 62)}" r="12" opacity="0.14"/></g>`,
      );
    }
  }
  s += `<rect x="${f(x)}" y="${f(eave)}" width="${f(w)}" height="${f(base - eave)}" fill="${wall}"/>`;
  s += `<path d="M${f(x - 10)} ${f(eave + 2)} L${f(x + w / 2)} ${f(peak)} L${f(x + w + 10)} ${f(eave + 2)} Z" fill="${roof}"/>`;
  roofs.push({ x, w, peak, eave });
  // Attic window in the gable: the one bit of most houses that shows above the screenshot.
  const ay = peak + roofH * 0.5;
  const lit = p.dark ? r() < 0.75 : r() < 0.25;
  const fill = lit ? p.windowLit : p.window;
  if (r() < 0.5) {
    s += `<circle cx="${f(x + w / 2)}" cy="${f(ay)}" r="8" fill="${fill}" stroke="${p.trim}" stroke-width="2.5"/>`;
    if (lit && p.dark) glow.push(`<circle cx="${f(x + w / 2)}" cy="${f(ay)}" r="13"/>`);
  } else {
    s += `<rect x="${f(x + w / 2 - 9)}" y="${f(ay - 8)}" width="18" height="16" rx="2" fill="${fill}" stroke="${p.trim}" stroke-width="2.5"/>`;
    if (lit && p.dark) glow.push(`<rect x="${f(x + w / 2 - 14)}" y="${f(ay - 13)}" width="28" height="26" rx="6"/>`);
  }
  // Front windows and door (seen at the sides and on tall phones).
  const rowY = eave + 26;
  const cols = w > 150 ? 3 : 2;
  for (let i = 0; i < cols; i++) {
    const wx = x + (w / (cols + 1)) * (i + 1) - 13;
    const l = p.dark ? r() < 0.7 : r() < 0.15;
    s += `<rect x="${f(wx)}" y="${f(rowY)}" width="26" height="30" rx="2" fill="${l ? p.windowLit : p.window}" stroke="${p.trim}" stroke-width="3"/>`;
    s += `<line x1="${f(wx + 13)}" y1="${f(rowY)}" x2="${f(wx + 13)}" y2="${f(rowY + 30)}" stroke="${p.trim}" stroke-width="2"/>`;
    if (l && p.dark) glow.push(`<rect x="${f(wx - 6)}" y="${f(rowY - 6)}" width="38" height="42" rx="8"/>`);
  }
  const dx = x + w * (r() < 0.5 ? 0.3 : 0.62);
  s += `<rect x="${f(dx)}" y="${f(base - 44)}" width="22" height="44" rx="2" fill="${p.door}"/>`;
  s += `<rect x="${f(dx - 4)}" y="${f(base - 2)}" width="30" height="4" fill="${p.trim}"/>`;
  return s;
}

function lamp(p: Palette, x: number, base: number, top: number) {
  return (
    `<circle cx="${x}" cy="${top + 6}" r="46" fill="url(#lampGlow)"/>` +
    `<rect x="${x - 3}" y="${top}" width="6" height="${base - top}" rx="2" fill="${p.lamp}"/>` +
    `<rect x="${x - 9}" y="${base - 6}" width="18" height="6" rx="2" fill="${p.lamp}"/>` +
    `<path d="M${x - 12} ${top + 2} L${x + 12} ${top + 2} L${x + 8} ${top - 14} L${x - 8} ${top - 14} Z" fill="${p.lamp}"/>` +
    `<rect x="${x - 7}" y="${top + 2}" width="14" height="10" rx="2" fill="${p.lampGlow}"/>`
  );
}

function person(r: () => number, p: Palette, x: number, ground: number, scale = 1, wave = false) {
  const body = pick(r, p.people);
  const skin = pick(r, p.skin);
  const legs = p.dark ? "#121614" : "#4a4f4a";
  const s = scale;
  let g = `<g transform="translate(${f(x)} ${f(ground)}) scale(${s})">`;
  g += `<rect x="-7" y="-26" width="5" height="26" rx="2.5" fill="${legs}"/><rect x="2" y="-26" width="5" height="26" rx="2.5" fill="${legs}"/>`;
  g += `<rect x="-10" y="-58" width="20" height="36" rx="9" fill="${body}"/>`;
  if (wave) g += `<rect x="8" y="-74" width="5" height="26" rx="2.5" fill="${body}" transform="rotate(24 10 -52)"/>`;
  g += `<circle cx="0" cy="-67" r="8.5" fill="${skin}"/>`;
  g += `</g>`;
  return g;
}

function dog(p: Palette, x: number, ground: number) {
  const c = p.dark ? "#3a302a" : "#8a6e5d";
  return `<g transform="translate(${x} ${ground})"><ellipse cx="0" cy="-12" rx="14" ry="7" fill="${c}"/><circle cx="14" cy="-18" r="6" fill="${c}"/><rect x="-11" y="-8" width="3.5" height="8" fill="${c}"/><rect x="7" y="-8" width="3.5" height="8" fill="${c}"/><path d="M-13 -14 q-8 -6 -6 -12" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
}

// A strand of party lights: a sagging wire with bulbs along it.
function strand(p: Palette, x1: number, y1: number, x2: number, y2: number, sag: number, bulbs: number, phase: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + sag;
  let s = `<path d="M${x1} ${y1} Q${mx} ${my + sag} ${x2} ${y2}" stroke="${p.wire}" stroke-width="1.6" fill="none"/>`;
  for (let i = 1; i < bulbs; i++) {
    const t = i / bulbs;
    const bx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2;
    const by = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * (my + sag) + t * t * y2;
    const cls = `b${(i + phase) % 3}`;
    if (p.dark) s += `<circle class="${cls}" cx="${f(bx)}" cy="${f(by + 5)}" r="9" fill="url(#bulbGlow)"/>`;
    s += `<rect x="${f(bx - 0.8)}" y="${f(by)}" width="1.6" height="3" fill="${p.wire}"/>`;
    s += `<circle class="${cls}" cx="${f(bx)}" cy="${f(by + 5.5)}" r="3.4" fill="${p.bulb}"/>`;
  }
  return s;
}

export function drawScene(p: Palette) {
  const r = rng(20261120);
  const glow: string[] = [];
  const smoke: string[] = [];
  const roofs: Roof[] = [];
  const backBase = 330;
  let houses = "";
  let trees = "";

  // The street of houses along the top band.
  let x = -40;
  while (x < W + 20) {
    const w = 120 + r() * 60;
    const mid = x + w / 2;
    const peak = inCenter(mid) ? 128 + r() * 34 : 86 + r() * 32;
    houses += house(r, p, x, w, peak, backBase, glow, smoke, roofs);
    x += w + 24 + r() * 40;
    if (r() < 0.6 && x < W) {
      const tx = x - 14 - r() * 10;
      const top = inCenter(tx) ? 118 + r() * 24 : 48 + r() * 40;
      trees += tree(r, p, tx, backBase - 2, top);
    }
  }

  // Ground: front yards, sidewalk, street, the near sidewalk and the park in front.
  let ground = `<rect x="0" y="${backBase}" width="${W}" height="${H - backBase}" fill="${p.lawnNear}"/>`;
  ground += `<rect x="0" y="${backBase}" width="${W}" height="34" fill="${p.lawn}"/>`;
  ground += `<rect x="0" y="${backBase + 34}" width="${W}" height="20" fill="${p.sidewalk}"/>`;
  ground += `<rect x="0" y="${backBase + 54}" width="${W}" height="170" fill="${p.street}"/>`;
  for (let dx = 20; dx < W; dx += 90) ground += `<rect x="${dx}" y="${backBase + 136}" width="46" height="5" rx="2.5" fill="${p.streetLine}"/>`;
  ground += `<rect x="0" y="${backBase + 224}" width="${W}" height="24" fill="${p.sidewalk}"/>`;
  const near = backBase + 248;

  // Lamps along the near sidewalk; the outer two show beside the screenshot.
  let props = "";
  for (const lx of [64, 520, 1080, 1536]) props += lamp(p, lx, near, near - 230);

  // Neighbors on the near sidewalk, at the edges where they show.
  let folks = "";
  folks += person(r, p, 104, near, 1.25, true);
  folks += person(r, p, 30, near + 6, 1.15);
  folks += dog(p, 140, near + 4);
  folks += person(r, p, 1494, near, 1.2);
  folks += person(r, p, 1566, near + 4, 1.25, true);
  folks += person(r, p, 1460, near + 260, 1.6);
  folks += person(r, p, 118, near + 300, 1.7, true);
  folks += person(r, p, 60, near + 310, 1.5);

  // The park: big trees in the near corners, a picnic table, and a hedge with a picket fence at the bottom.
  let park = "";
  park += tree(r, p, 40, near + 470, near + 120);
  park += tree(r, p, 1580, near + 460, near + 90);
  park += `<g fill="${p.trunk}"><rect x="1468" y="${near + 360}" width="90" height="8" rx="3"/><rect x="1474" y="${near + 368}" width="6" height="34"/><rect x="1546" y="${near + 368}" width="6" height="34"/><rect x="1460" y="${near + 384}" width="106" height="6" rx="3"/></g>`;
  const hedgeY = H - 92;
  let hedge = `<path d="M0 ${H} L0 ${hedgeY + 30}`;
  for (let hx = 0; hx <= W; hx += 60) hedge += ` Q${hx + 30} ${hedgeY - 6 - r() * 14} ${hx + 60} ${hedgeY + 26}`;
  hedge += ` L${W} ${H} Z" fill="${p.hedge}"/>`;
  park += hedge;
  let fence = "";
  for (let fx = 8; fx < W; fx += 22) fence += `<path d="M${fx} ${H} L${fx} ${hedgeY + 18} L${fx + 6} ${hedgeY + 10} L${fx + 12} ${hedgeY + 18} L${fx + 12} ${H} Z"/>`;
  park += `<g fill="${p.fence}" opacity="${p.dark ? 0.7 : 0.95}">${fence}<rect x="0" y="${hedgeY + 34}" width="${W}" height="6"/><rect x="0" y="${hedgeY + 62}" width="${W}" height="6"/></g>`;
  let flowers = "";
  for (let i = 0; i < 70; i++) {
    const fx = r() * W;
    const fy = hedgeY + 6 + r() * 30;
    flowers += `<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(2.5 + r() * 2.5)}" fill="${pick(r, p.flowers)}"/>`;
  }
  park += flowers;

  // Party lights strung across the street: high at the edges, sagging below the hero note in the middle.
  let lights = "";
  lights += strand(p, 0, 70, 300, 120, 22, 12, 0);
  lights += strand(p, 300, 120, 800, 178, 40, 18, 1);
  lights += strand(p, 800, 178, 1300, 120, 40, 18, 2);
  lights += strand(p, 1300, 120, 1600, 64, 22, 12, 0);

  // A cat sitting on the ridge of the last house on the right.
  const catRoof = [...roofs].reverse().find((h) => h.x + h.w / 2 < W - 40 && !inCenter(h.x + h.w / 2))!;
  const catColor = p.dark ? "#0c100e" : "#3f3a36";
  const cx = catRoof.x + catRoof.w / 2 - 22;
  const cy = catRoof.peak + 15;
  const cat = `<g fill="${catColor}" transform="translate(${f(cx)} ${f(cy)})"><ellipse cx="0" cy="-9" rx="9" ry="11"/><circle cx="1" cy="-23" r="6.5"/><path d="M-4 -27 l1 -7 l4 5 Z M3 -28 l3 -6 l2 7 Z"/><path d="M7 -2 q14 2 10 -14" stroke="${catColor}" stroke-width="3" fill="none" stroke-linecap="round"/>${
    p.dark ? `<circle cx="-1" cy="-24" r="1.2" fill="#e8d36a"/><circle cx="3.5" cy="-24" r="1.2" fill="#e8d36a"/>` : ""
  }</g>`;

  // By day the waving neighbor on the left flies a kite; by night fireflies drift over the park.
  let extra = "";
  if (!p.dark) {
    const hx = 118;
    const hy = near - 92;
    const kx = 238;
    const ky = 30;
    extra += `<path d="M${hx} ${hy} Q ${kx - 160} ${(hy + ky) / 2 + 60} ${kx} ${ky + 34}" stroke="#5d6a5f" stroke-width="1" fill="none" opacity="0.7"/>`;
    extra += `<g class="kite"><path d="M${kx} ${ky} L${kx + 20} ${ky + 22} L${kx} ${ky + 34 + 20} L${kx - 20} ${ky + 22} Z" fill="#c9785a"/><path d="M${kx} ${ky} L${kx} ${ky + 54} M${kx - 20} ${ky + 22} L${kx + 20} ${ky + 22}" stroke="#fbf8f1" stroke-width="1.5"/><path d="M${kx} ${ky + 54} q-10 14 0 26 q10 12 -2 26" stroke="#5d6a5f" stroke-width="1" fill="none"/>`;
    for (const [bx, by, c] of [
      [kx - 3, ky + 66, "#4e3d70"],
      [kx + 4, ky + 82, "#d6a54a"],
      [kx - 2, ky + 98, "#2f5a44"],
    ] as const)
      extra += `<path d="M${bx - 5} ${by - 3} L${bx + 5} ${by + 3} M${bx - 5} ${by + 3} L${bx + 5} ${by - 3}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    extra += `</g>`;
  } else {
    let flies = "";
    for (let i = 0; i < 46; i++) {
      const side = r() < 0.5;
      const fx = side ? r() * 150 : W - r() * 150;
      const fy = near + 30 + r() * 480;
      flies += `<circle class="ff f${i % 3}" cx="${f(fx)}" cy="${f(fy)}" r="${f(1.6 + r() * 1.4)}"/>`;
    }
    for (let i = 0; i < 26; i++)
      flies += `<circle class="ff f${i % 3}" cx="${f(r() * W)}" cy="${f(H - 140 + r() * 70)}" r="${f(1.4 + r() * 1.2)}"/>`;
    extra += `<g fill="#e8f0a0" filter="url(#fly)">${flies}</g>`;
  }


  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMin slice">
<defs>
<radialGradient id="lampGlow"><stop offset="0" stop-color="${p.lampGlow}" stop-opacity="${p.dark ? 0.55 : 0.35}"/><stop offset="1" stop-color="${p.lampGlow}" stop-opacity="0"/></radialGradient>
<radialGradient id="bulbGlow"><stop offset="0" stop-color="${p.bulb}" stop-opacity="0.7"/><stop offset="1" stop-color="${p.bulb}" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="fly" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.dark ? "#0b1110" : "#fff8ea"}" stop-opacity="0"/><stop offset="1" stop-color="${p.dark ? "#0b1110" : "#fff8ea"}" stop-opacity="${p.dark ? 0.35 : 0.25}"/></linearGradient>
</defs>
<style>
${
  p.dark
    ? `.b0{animation:tw 3.2s ease-in-out infinite}.b1{animation:tw 4.1s ease-in-out .8s infinite}.b2{animation:tw 3.7s ease-in-out 1.6s infinite}@keyframes tw{50%{opacity:.55}}
.ff{animation:glow 2.6s ease-in-out infinite}.f1{animation-delay:.9s;animation-duration:3.4s}.f2{animation-delay:1.7s;animation-duration:2.2s}@keyframes glow{0%,100%{opacity:.15}50%{opacity:1}}`
    : `.kite{transform-box:fill-box;transform-origin:50% 0;animation:sway 5s ease-in-out infinite}@keyframes sway{50%{transform:rotate(6deg) translateY(4px)}}`
}
.smoke{animation:rise 6s ease-in-out infinite}@keyframes rise{50%{transform:translate(3px,-4px);opacity:.7}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
${hills(p)}
<rect x="0" y="60" width="${W}" height="140" fill="url(#haze)"/>
${trees}
${smoke.join("")}
${houses}
${cat}
${p.dark ? `<g fill="${p.windowLit}" opacity="0.5" filter="url(#soft)">${glow.join("")}</g>` : ""}
${ground}
${props}
${folks}
${park}
${lights}
${extra}
</svg>
`;
}

// The sky behind the hero's words (the UFO is a button in index.html, so it can be clicked): drawn at the top of the panel, transparent so the CSS gradient shows through.
const SW = 1600;
const SH = 900;

function cloud(x: number, y: number, s: number, fill: string, opacity: number, cls = "") {
  return `<g class="${cls}" opacity="${opacity}" transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><circle cx="-46" cy="0" r="26"/><circle cx="-12" cy="-18" r="36"/><circle cx="28" cy="-8" r="30"/><circle cx="58" cy="4" r="20"/><rect x="-72" y="0" width="150" height="24" rx="12"/></g>`;
}

function flock(x: number, y: number, n: number, c: string, scale = 1) {
  let s = `<g class="flock" stroke="${c}" stroke-width="${f(2 / scale)}" fill="none" stroke-linecap="round" transform="translate(${x} ${y}) scale(${scale})">`;
  for (let i = 0; i < n; i++) {
    const bx = i * 22 - (i % 2) * 6;
    const by = Math.abs(i - (n - 1) / 2) * 10 + (i % 2) * 4;
    s += `<path d="M${bx - 8} ${by} q4 -5 8 0 q4 -5 8 0"/>`;
  }
  return s + `</g>`;
}

export function drawSky(night: boolean) {
  const r = rng(424242);
  let art = "";
  if (night) {
    let st = `<g fill="#f3efe4">`;
    for (let i = 0; i < 260; i++) {
      const x = r() * SW;
      const y = r() * SH * 0.95;
      // Fewer and fainter behind the headline so the words stay crisp.
      const behindText = x > 420 && x < 1180 && y > 120 && y < 720;
      if (behindText && r() < 0.55) continue;
      const big = r() < 0.08;
      const cls = r() < 0.25 ? ` class="t${i % 3}"` : "";
      st += `<circle${cls} cx="${f(x)}" cy="${f(y)}" r="${f(big ? 1.8 + r() : 0.5 + r() * 1)}" opacity="${f((behindText ? 0.25 : 0.4) + r() * 0.5)}"/>`;
    }
    // A few four-point sparkles in the corners.
    for (const [x, y, s] of [
      [180, 90, 1],
      [1450, 330, 0.8],
      [330, 520, 0.7],
      [1270, 70, 0.9],
    ] as const)
      st += `<path class="t1" transform="translate(${x} ${y}) scale(${s})" d="M0 -9 Q1 -1 9 0 Q1 1 0 9 Q-1 1 -9 0 Q-1 -1 0 -9 Z"/>`;
    art += st + `</g>`;
    // Moon with a soft halo.
    art += `<circle cx="1360" cy="150" r="90" fill="url(#halo)"/><circle cx="1360" cy="150" r="34" fill="#f1ead2"/><circle cx="1376" cy="140" r="31" fill="#131d22"/><circle cx="1347" cy="160" r="3.5" fill="#d8cfb4" opacity="0.6"/><circle cx="1340" cy="138" r="2.2" fill="#d8cfb4" opacity="0.6"/>`;
    art += `<path class="shoot" d="M520 70 L640 120" stroke="url(#trail)" stroke-width="2.2" stroke-linecap="round"/>`;
    art += cloud(170, 330, 1.1, "#2a3440", 0.55, "drift");
    art += cloud(1440, 470, 0.9, "#2f3340", 0.5, "drift2");
    art += cloud(1180, 250, 0.6, "#28313b", 0.4, "drift");
    art += cloud(300, 640, 0.7, "#3a3340", 0.45, "drift2");
    art += flock(1240, 560, 3, "#0b1214", 0.9);
  } else {
    art += cloud(160, 200, 1.25, "#ffffff", 0.85, "drift");
    art += cloud(1420, 120, 1.05, "#ffffff", 0.85, "drift2");
    art += cloud(1480, 420, 0.8, "#ffffff", 0.7, "drift");
    art += cloud(320, 560, 0.75, "#ffffff", 0.65, "drift2");
    art += cloud(820, 70, 0.6, "#ffffff", 0.5, "drift");
    art += cloud(1180, 600, 0.55, "#ffffff", 0.45, "drift2");
    art += flock(250, 380, 5, "#5d6a5f", 0.9);
    art += flock(1230, 300, 3, "#5d6a5f", 0.8);
    art += flock(1330, 640, 2, "#5d6a5f", 0.7);
    // A hot-air balloon drifting over the far side.
    art += `<g class="balloon" transform="translate(1260 400)"><path d="M0 -40 C 26 -40 30 -14 22 2 L8 22 L-8 22 L-22 2 C -30 -14 -26 -40 0 -40 Z" fill="#c9785a"/><path d="M0 -40 C 10 -40 12 -14 8 2 L3 22 L-3 22 L-8 2 C -12 -14 -10 -40 0 -40 Z" fill="#f2cf72"/><path d="M-7 22 L-5 30 M7 22 L5 30" stroke="#7a6552" stroke-width="1.2"/><rect x="-6" y="30" width="12" height="9" rx="2" fill="#8a6e5d"/></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}">
<defs>
<radialGradient id="halo"><stop offset="0" stop-color="#f1ead2" stop-opacity="0.28"/><stop offset="1" stop-color="#f1ead2" stop-opacity="0"/></radialGradient>
<linearGradient id="trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.9"/></linearGradient>
</defs>
<style>
.drift{animation:drift 38s ease-in-out infinite}.drift2{animation:drift 46s ease-in-out -12s infinite reverse}@keyframes drift{50%{translate:28px 0}}
.balloon{animation:float 9s ease-in-out infinite}@keyframes float{50%{translate:-10px -12px}}
.flock{animation:fly 14s ease-in-out infinite}@keyframes fly{50%{translate:22px -8px}}
.t0{animation:tw 3s ease-in-out infinite}.t1{animation:tw 4.4s ease-in-out 1s infinite}.t2{animation:tw 3.6s ease-in-out 2s infinite}@keyframes tw{50%{opacity:.2}}
.shoot{opacity:0;animation:shoot 9s ease-out 3s infinite}@keyframes shoot{0%{opacity:0;translate:0 0}2%{opacity:1}8%{opacity:0;translate:180px 75px}100%{opacity:0;translate:180px 75px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.shoot{opacity:0}}
</style>
${art}
</svg>
`;
}


// The street: the scene's top 600 units (hills, houses, string lights, the kite, the street and the neighbors on the
// near sidewalk). Below it the scene is a park that only makes sense behind the marketing site's screenshot, so
// screens that only have room for a strip along the bottom (Neighbors' sign-in) draw this crop.
export const STREET_HEIGHT = 600;

export function cropStreet(scene: string) {
  return scene.replace(
    /<svg [^>]*>/,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${STREET_HEIGHT}" width="${W}" height="${STREET_HEIGHT}">`,
  );
}

// The sky the art sits on. The sky SVGs are transparent, so a page paints these behind them: a vertical wash from the
// top of the sky down to the warm horizon, and a glow that sits just above the houses. Where the glow sits is the
// page's call (the marketing hero puts it at 62%, the sign-in at 78%), so only its colour is shared.
export const sky = {
  light: {
    gradient: "linear-gradient(180deg, #e3ebe5 0%, #efebe0 42%, #f5dfc6 78%, #f2cfae 100%)",
    glow: "rgb(255 226 186 / 0.55)",
    ground: light.lawnNear,
  },
  dark: {
    gradient: "linear-gradient(180deg, #0b1214 0%, #131d22 38%, #26252f 72%, #3f2d31 100%)",
    glow: "rgb(255 170 120 / 0.22)",
    ground: dark.lawnNear,
  },
} as const;

export function skyCss() {
  const lines = (["light", "dark"] as const).flatMap((theme) => [
    `  --neighborhood-sky-${theme}: ${sky[theme].gradient};`,
    `  --neighborhood-glow-${theme}: ${sky[theme].glow};`,
    `  --neighborhood-ground-${theme}: ${sky[theme].ground};`,
  ]);
  return `/* Generated by scripts/neighborhood-art.ts (bun run art:neighborhood); don't edit by hand.
   The colours behind ManyAve's neighborhood illustration, one set per theme: the sky's wash, the glow above the
   houses (place it with a radial-gradient where the page's horizon is) and the lawn colour below the street.
   Art colours, not tokens: they belong to the picture and never theme anything else. */
:root {
${lines.join("\n")}
}
`;
}

/** Every file in art/neighborhood/, by name, as this code draws it. */
export function artFiles(): Record<string, string> {
  const files: Record<string, string> = { "sky.css": skyCss() };
  for (const [theme, palette] of [["light", light], ["dark", dark]] as const) {
    const scene = drawScene(palette);
    files[`neighborhood-${theme}.svg`] = scene;
    files[`street-${theme}.svg`] = cropStreet(scene);
    files[`sky-${theme}.svg`] = drawSky(palette.dark);
  }
  return files;
}

const root = path.resolve(import.meta.dir, "..");
export const ART_DIR = path.join(root, "art/neighborhood");
export const BACKDROP_DIR = path.join(root, "native/art");

/** The committed files that differ from what the code draws (empty when art/neighborhood/ is up to date). */
export async function staleArt() {
  const stale: string[] = [];
  for (const [name, content] of Object.entries(artFiles())) {
    const file = Bun.file(path.join(ART_DIR, name));
    if (!(await file.exists()) || (await file.text()) !== content) stale.push(name);
  }
  return stale;
}

// The phone backdrop: the sky filling an iPhone-sized screen (393 x 852 points, rendered at 3x) with the street
// pinned to the bottom, the way Neighbors' sign-in draws it on the web below 1024px. An app fills the screen with it,
// bottom aligned, so a shorter phone loses only sky. The sky art is centred so the balloon stays off a headline.
export const BACKDROP = { width: 393, height: 852, scale: 3, skyWidth: 900, streetWidth: 640, glowAt: "50% 78%" };

export function backdropHtml(theme: "light" | "dark") {
  const s = sky[theme];
  const glowSize = theme === "light" ? "60% 40%" : "55% 35%";
  return `<!doctype html><html><head><style>
html,body{margin:0;height:100%}
.sky{height:100%;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;background:
  url("sky-${theme}.svg") 50% top / max(100%, ${BACKDROP.skyWidth}px) auto no-repeat,
  radial-gradient(${glowSize} at ${BACKDROP.glowAt}, ${s.glow}, transparent 70%),
  ${s.gradient}}
.street{flex:none;display:block;width:max(100%, ${BACKDROP.streetWidth}px);height:auto}
</style></head><body><div class="sky"><img class="street" src="street-${theme}.svg" alt=""></div></body></html>`;
}

async function renderBackdrops() {
  const { chromium } = await import("playwright");
  const executablePath = process.env.AVENUE_CHROMIUM;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  await mkdir(BACKDROP_DIR, { recursive: true });
  try {
    for (const theme of ["light", "dark"] as const) {
      const page = await browser.newPage({
        viewport: { width: BACKDROP.width, height: BACKDROP.height },
        deviceScaleFactor: BACKDROP.scale,
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      // Written next to the SVGs for the moment it renders, so the page loads them by relative path.
      const html = path.join(ART_DIR, `.backdrop-${theme}.html`);
      await Bun.write(html, backdropHtml(theme));
      try {
        await page.goto(`file://${html}`, { waitUntil: "load" });
        await Bun.write(path.join(BACKDROP_DIR, `neighborhood-backdrop-${theme}.png`), await page.screenshot({ type: "png" }));
      } finally {
        await Bun.file(html).delete();
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

if (import.meta.main) {
  await mkdir(ART_DIR, { recursive: true });
  for (const [name, content] of Object.entries(artFiles())) await Bun.write(path.join(ART_DIR, name), content);
  console.log("wrote art/neighborhood/{neighborhood,street,sky}-{light,dark}.svg and sky.css");
  if (process.argv.includes("--backdrops")) {
    await renderBackdrops();
    console.log("wrote native/art/neighborhood-backdrop-{light,dark}.png");
  }
}
