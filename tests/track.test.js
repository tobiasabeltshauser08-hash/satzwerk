// Selbsttest für die GPS-Strecke (Vereinfachen, Speichern, Bestzeiten, Kartenform)
// Aufruf: node tests/track.test.js
import assert from 'node:assert/strict';
import { simplify, encodeTrack, decodeTrack, bestEfforts, bestOf, isRecord, trackShape } from '../js/track.js';

// Synthetische Strecke: 10 km, Punkte alle 10 m, erst 6 km nach Norden, dann 4 km nach Osten.
// Tempo 10:00/km (Gehen), nur Kilometer 4–5 in 6:40/km; nach 2,5 km eine Pause (brk, Stoppuhr läuft ohne Pause weiter).
const LAT0 = 48.1, LON0 = 11.5, M_LAT = 111195, M_LON = M_LAT * Math.cos(48.1 * Math.PI / 180);
function route() {
  const pts = [];
  let t = 0;
  for (let i = 0; i <= 1000; i++) {
    const m = i * 10;
    if (i) t += m > 4000 && m <= 5000 ? 4 : 6;
    const lat = LAT0 + Math.min(m, 6000) / M_LAT, lon = LON0 + Math.max(0, m - 6000) / M_LON;
    const p = { lat, lon, t, m };
    if (m === 2500) p.brk = true;
    pts.push(p);
  }
  return pts;
}
const pts = route();

// encode/decode: Rundreise inkl. brk, Genauigkeit, Länge
const enc = encodeTrack(pts);
assert.ok(enc.startsWith('1:'));
assert.ok(/^1:[A-Za-z0-9_-]*$/.test(enc), 'nur URL-sichere Zeichen');
assert.ok((enc.length - 2) / pts.length < 12, `${(enc.length - 2) / pts.length} Zeichen pro Punkt`);
const dec = decodeTrack(enc);
assert.equal(dec.length, pts.length);
dec.forEach((p, i) => {
  const q = pts[i];
  assert.equal(p.lat, Math.round(q.lat * 1e5) / 1e5);
  assert.equal(p.lon, Math.round(q.lon * 1e5) / 1e5);
  assert.equal(p.t, q.t);
  assert.equal(p.m, q.m);
  assert.equal(!!p.brk, !!q.brk, `brk bei ${i}`);
});
assert.equal(dec.filter(p => p.brk).length, 1);
// Negative Koordinaten, nicht ganzzahlige t/m
const neg = [{ lat: -33.85678, lon: -151.21529, t: 0.4, m: 0.6 }, { lat: -33.857, lon: -151.2, t: 7.6, m: 12.2, brk: true }];
assert.deepEqual(decodeTrack(encodeTrack(neg)), [{ lat: -33.85678, lon: -151.21529, t: 0, m: 1 }, { lat: -33.857, lon: -151.2, t: 8, m: 12, brk: true }]);
assert.equal(encodeTrack([]), '1:');
assert.deepEqual(decodeTrack('1:'), []);
for (const bad of [null, undefined, 42, '', 'x', '2:AAAA', '1:AAA', '1:AA!A', enc.slice(0, -1), '1:' + '_'.repeat(20)])
  assert.deepEqual(decodeTrack(bad), [], `ungültig: ${String(bad).slice(0, 20)}`);

// simplify: Gerade fällt weg, Ecke, Enden, brk und Punkt davor bleiben; t/m unverändert
const s = simplify(pts);
assert.deepEqual(s.map(p => p.m), [0, 2490, 2500, 6000, 10000]);
s.forEach(p => assert.equal(p, pts[p.m / 10], 'Punkt unverändert übernommen'));
assert.ok(s[2].brk);
// Kleine Zacke unter der Toleranz verschwindet, große bleibt
const zig = pts.slice(0, 101).map((p, i) => ({ ...p, brk: false, lon: p.lon + (i === 50 ? 2 / M_LON : i === 70 ? 20 / M_LON : 0) }));
assert.deepEqual(simplify(zig).map(p => p.m), [0, 690, 700, 710, 1000]);
assert.deepEqual(simplify(zig, 1).map(p => p.m), [0, 490, 500, 510, 690, 700, 710, 1000]);
assert.deepEqual(simplify(pts.slice(0, 2)), pts.slice(0, 2));
assert.deepEqual(simplify([]), []);

// bestEfforts: schnellster km ist km 4–5 (400 s), 5 km = 4 × 600 + 400, 10 km = alles
assert.deepEqual(bestEfforts(pts), { 1000: 400, 5000: 2800, 10000: 5800 });
assert.deepEqual(bestEfforts(pts.slice(0, 551)), { 1000: 400, 5000: 2800, 10000: null });
assert.equal(bestEfforts(pts.slice(0, 491))[5000], null, "4,9 km reichen nicht für 5 km");
assert.deepEqual(bestEfforts(pts, [400, 1500]), { 400: 160, 1500: 700 });
// Interpolation zwischen groben Punkten
const coarse = [{ m: 0, t: 0 }, { m: 300, t: 100 }, { m: 1300, t: 300 }, { m: 1600, t: 500 }];
assert.deepEqual(bestEfforts(coarse, [1000]), { 1000: 200 });
assert.deepEqual(bestEfforts([], [1000]), { 1000: null });
// Gleiche Meter hintereinander (Stillstand) stören nicht
assert.deepEqual(bestEfforts([{ m: 0, t: 0 }, { m: 500, t: 150 }, { m: 500, t: 200 }, { m: 1000, t: 350 }], [1000]), { 1000: 350 });

// bestOf / isRecord
const entries = [
  { date: '2026-10-01', act: 'lauf', best: { 1000: 300, 5000: 1600, 10000: null } },
  { date: '2026-10-05', act: 'rad' },
  { date: '2026-10-08', act: 'lauf', best: { 1000: 280, 5000: 1650, 10000: null } },
  { date: '2026-10-12', act: 'lauf', best: { 1000: 280, 5000: 1500, 10000: 3300 } },
];
assert.deepEqual(bestOf(entries), {
  1000: { sec: 280, date: '2026-10-08', i: 2 },
  5000: { sec: 1500, date: '2026-10-12', i: 3 },
  10000: { sec: 3300, date: '2026-10-12', i: 3 },
});
assert.deepEqual(bestOf([]), { 1000: null, 5000: null, 10000: null });
const prev = bestOf(entries.slice(0, 3));
assert.deepEqual(isRecord(entries[3].best, prev), [5000, 10000]);
assert.deepEqual(isRecord({ 1000: 279, 5000: 1600, 10000: null }, prev), [1000]);
assert.deepEqual(isRecord({ 1000: 279 }, { 1000: 280 }), [1000]);
assert.deepEqual(isRecord(null, prev), []);

// trackShape
const W = 320, H = 200, PAD = 12;
const sh = trackShape(pts);
assert.equal(sh.w, W); assert.equal(sh.h, H);
const nums = [...sh.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => [+m[1], +m[2]]);
assert.equal(nums.length, pts.length);
assert.ok(sh.d.split(/[ML]/).slice(1).every(x => /^-?\d+(\.\d)? -?\d+(\.\d)?$/.test(x)), 'eine Dezimalstelle');
const xs = nums.map(p => p[0]), ys = nums.map(p => p[1]);
const bx = Math.max(...xs) - Math.min(...xs), by = Math.max(...ys) - Math.min(...ys);
assert.ok(Math.abs(bx / by - 4 / 6) < 0.01, `Seitenverhältnis ${bx / by}`);
assert.ok(xs.every(x => x >= PAD - 0.05 && x <= W - PAD + 0.05) && ys.every(y => y >= PAD - 0.05 && y <= H - PAD + 0.05), 'im Rahmen');
assert.ok(Math.abs(by - (H - 2 * PAD)) < 0.2, 'füllt die Höhe');
assert.ok(Math.abs((Math.max(...xs) + Math.min(...xs)) / 2 - W / 2) < 0.2, 'waagrecht zentriert');
// Norden oben: Start unten links, Ecke oben, Ziel rechts oben
assert.deepEqual(sh.start, nums[0]);
assert.deepEqual(sh.end, nums[nums.length - 1]);
assert.ok(sh.start[1] > nums[600][1], 'Norden oben');
assert.ok(sh.end[0] > sh.start[0], 'Osten rechts');
assert.equal((sh.d.match(/M/g) || []).length, 2, 'Pause beginnt neuen Teilpfad');
assert.equal(sh.kms.length, 10);
sh.kms.forEach((k, i) => assert.deepEqual(k, nums[(i + 1) * 100], `km ${i + 1}`));
// Ohne Pause ein Teilpfad, 3,5 km -> 3 Marken
const plain = pts.slice(0, 351).map(p => ({ ...p, brk: false }));
assert.equal((trackShape(plain).d.match(/M/g) || []).length, 1);
assert.equal(trackShape(plain).kms.length, 3);
// Reine Nord-Süd-Strecke: Breite 0, mittig
const ns = trackShape(plain, 100, 100, 10);
assert.ok(ns.start[0] === 50 && ns.end[0] === 50 && ns.start[1] === 90 && ns.end[1] === 10);
assert.equal(trackShape(pts.slice(0, 1)), null);
assert.equal(trackShape([]), null);
assert.ok(trackShape([pts[0], { ...pts[0], t: 5 }]).d.length > 0, 'Stillstand ohne Fehler');

console.log('OK: GPS-Strecke geprüft');
