// GPS-Strecke: vereinfachen, kompakt speichern, Bestzeiten, Kartenform – ohne DOM, damit es sich mit Node testen lässt
// Punkt: { lat, lon, t, m, brk } – t = Sekunden der Stoppuhr (ohne Pausen), m = Meter kumuliert, brk = erster Punkt nach einer Pause

const R = 6371000, RAD = Math.PI / 180;

// ---------- Vereinfachen (Douglas-Peucker) ----------
// Abstand von p zur Strecke a–b in Metern; Punkte sind schon lokal projiziert ({ x, y } in m)
function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const u = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy);
}

// Behält ersten/letzten Punkt, jeden brk-Punkt und den Punkt davor; t/m bleiben unverändert
export function simplify(pts, tol = 4) {
  if (!Array.isArray(pts) || pts.length < 3) return pts ? pts.slice() : [];
  const lat0 = pts[0].lat * RAD, kx = R * RAD * Math.cos(lat0), ky = R * RAD;
  const xy = pts.map(p => ({ x: p.lon * kx, y: p.lat * ky }));
  const keep = new Uint8Array(pts.length);
  // Teilstücke zwischen den Pausen getrennt vereinfachen, ihre Enden bleiben immer erhalten
  const starts = [0];
  for (let i = 1; i < pts.length; i++) if (pts[i].brk) starts.push(i);
  starts.forEach((s, j) => {
    const e = j + 1 < starts.length ? starts[j + 1] - 1 : pts.length - 1;
    keep[s] = keep[e] = 1;
    // Iterativ statt rekursiv, damit lange Läufe keinen Stapelüberlauf erzeugen
    const stack = [[s, e]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let max = 0, at = -1;
      for (let i = a + 1; i < b; i++) { const d = segDist(xy[i], xy[a], xy[b]); if (d > max) { max = d; at = i; } }
      if (at >= 0 && max > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
    }
  });
  return pts.filter((_, i) => keep[i]);
}

// ---------- Kompakt speichern ----------
// Ganzzahlen als Deltas, je 5 Bit pro Zeichen plus Fortsetzungs-Bit (wie Google-Polyline), URL-sicheres Alphabet ohne JSON-Escapes.
// Je Punkt: lat, lon (1e-5 Grad), t (s) mit brk im untersten Bit, m (Meter)
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const VER = "1:";
const zig = n => n < 0 ? -2 * n - 1 : 2 * n;
const unzig = n => n % 2 ? -(n + 1) / 2 : n / 2;
function put(out, n) {
  while (n >= 32) { out.push(ABC[32 + n % 32]); n = Math.floor(n / 32); }
  out.push(ABC[n]);
}

export function encodeTrack(pts) {
  const out = [];
  let prev = [0, 0, 0, 0];
  for (const p of pts || []) {
    const cur = [Math.round(p.lat * 1e5), Math.round(p.lon * 1e5), Math.round(p.t), Math.round(p.m)];
    put(out, zig(cur[0] - prev[0]));
    put(out, zig(cur[1] - prev[1]));
    put(out, zig(cur[2] - prev[2]) * 2 + (p.brk ? 1 : 0));
    put(out, zig(cur[3] - prev[3]));
    prev = cur;
  }
  return VER + out.join("");
}

// Ungültiger oder abgeschnittener String ergibt []
export function decodeTrack(str) {
  if (typeof str !== "string" || !str.startsWith(VER)) return [];
  const vals = [];
  let n = 0, mul = 1;
  for (let i = VER.length; i < str.length; i++) {
    const c = ABC.indexOf(str[i]);
    if (c < 0) return [];
    n += (c % 32) * mul;
    if (c >= 32) { mul *= 32; if (mul > 2 ** 45) return []; continue; }
    vals.push(n); n = 0; mul = 1;
  }
  if (mul !== 1 || vals.length % 4) return [];
  const pts = [];
  let lat = 0, lon = 0, t = 0, m = 0;
  for (let i = 0; i < vals.length; i += 4) {
    const tb = vals[i + 2];
    lat += unzig(vals[i]); lon += unzig(vals[i + 1]); t += unzig(Math.floor(tb / 2)); m += unzig(vals[i + 3]);
    const p = { lat: lat / 1e5, lon: lon / 1e5, t, m };
    if (tb % 2) p.brk = true;
    pts.push(p);
  }
  return pts;
}

// ---------- Bestzeiten ----------
// Schnellste zusammenhängende Strecke der Länge d. Die Zeit über die Strecke ist stückweise linear,
// das Minimum liegt also dort, wo Anfang oder Ende auf einem Messpunkt liegt: zwei Durchläufe mit je zwei Zeigern.
function fastest(pts, d) {
  const n = pts.length;
  if (n < 2 || pts[n - 1].m - pts[0].m < d) return null;
  const lerp = (a, b, x) => a.t + (b.t - a.t) * (x - a.m) / (b.m - a.m);
  let best = Infinity;
  // Ende auf Punkt j, Anfang interpoliert
  for (let j = 0, i = 0; j < n; j++) {
    const x = pts[j].m - d;
    if (x < pts[0].m) continue;
    while (i + 1 < j && pts[i + 1].m <= x) i++;
    const t0 = pts[i].m === x ? pts[i].t : lerp(pts[i], pts[i + 1], x);
    best = Math.min(best, pts[j].t - t0);
  }
  // Anfang auf Punkt i, Ende interpoliert
  for (let i = 0, k = 0; i < n; i++) {
    const y = pts[i].m + d;
    if (y > pts[n - 1].m) break;
    if (k < i) k = i;
    while (pts[k].m < y) k++;
    const t1 = pts[k].m === y ? pts[k].t : lerp(pts[k - 1], pts[k], y);
    best = Math.min(best, t1 - pts[i].t);
  }
  return Number.isFinite(best) ? Math.round(best) : null;
}

export const DISTS = [1000, 5000, 10000];
export function bestEfforts(pts, dists = DISTS) {
  const out = {};
  for (const d of dists) out[d] = fastest(pts || [], d);
  return out;
}

// Beste Zeiten über alle Ausdauer-Einträge mit Feld best; i = Index im Array
export function bestOf(entries, dists = DISTS) {
  const out = {};
  for (const d of dists) out[d] = null;
  (entries || []).forEach((e, i) => {
    if (!e || !e.best) return;
    for (const d of dists) {
      const sec = e.best[d];
      if (sec != null && Number.isFinite(sec) && (!out[d] || sec < out[d].sec)) out[d] = { sec, date: e.date, i };
    }
  });
  return out;
}

// Distanzen, bei denen best schneller ist als prev. prev darf ein bestOf- oder bestEfforts-Ergebnis sein;
// gibt es für eine Distanz noch keine Zeit, zählt die erste als Rekord.
export function isRecord(best, prev) {
  if (!best) return [];
  const sec = v => v == null ? null : typeof v === "object" ? v.sec : v;
  return Object.keys(best).map(Number).filter(d => {
    const b = sec(best[d]), p = sec(prev?.[d]);
    return b != null && (p == null || b < p);
  });
}

// ---------- Kartenform für SVG ----------
// Äquirektangulär mit cos(Breite), Seitenverhältnis erhalten, in w×h zentriert, Norden oben
export function trackShape(pts, w = 320, h = 200, pad = 12) {
  if (!Array.isArray(pts) || pts.length < 2) return null;
  const c = Math.cos(pts.reduce((a, p) => a + p.lat, 0) / pts.length * RAD);
  const xs = pts.map(p => p.lon * c), ys = pts.map(p => p.lat);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const dx = x1 - x0, dy = y1 - y0, iw = w - 2 * pad, ih = h - 2 * pad;
  // Stillstand (alle Punkte gleich) ergibt einen Punkt in der Mitte
  const s = Math.min(dx ? iw / dx : Infinity, dy ? ih / dy : Infinity);
  const k = Number.isFinite(s) ? s : 0;
  const ox = (w - dx * k) / 2, oy = (h - dy * k) / 2;
  const r1 = v => Math.round(v * 10) / 10;
  const at = (x, y) => [r1(ox + (x - x0) * k), r1(oy + (y1 - y) * k)];
  const xy = pts.map((_, i) => at(xs[i], ys[i]));
  const d = xy.map(([x, y], i) => `${i === 0 || pts[i].brk ? "M" : "L"}${x} ${y}`).join("");
  // Position bei jedem vollen Kilometer, zwischen zwei Punkten interpoliert
  const kms = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    for (let km = Math.floor(a.m / 1000) + 1; km * 1000 <= b.m; km++) {
      const u = (km * 1000 - a.m) / (b.m - a.m);
      kms.push(at(xs[i - 1] + (xs[i] - xs[i - 1]) * u, ys[i - 1] + (ys[i] - ys[i - 1]) * u));
    }
  }
  return { d, start: xy[0], end: xy[xy.length - 1], kms, w, h };
}
