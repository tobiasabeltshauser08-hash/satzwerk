// Selbsttest für Puls-Zonen, Körperwerte und Ernährung
// Aufruf: node tests/health.test.js
import assert from 'node:assert/strict';
import { hrMax, hrZones, segZone, sessZone, normBody, bodyStats, nutrition, activity } from '../js/health.js';
import { SEG, SESSIONS } from '../js/run.js';
import { QUESTIONS } from '../js/data.js';

// Puls
assert.equal(hrMax(30), 187);
assert.equal(hrMax(50), 173);
const z = hrZones({ age: 30, rest: 60 });
assert.equal(z.max, 187); assert.equal(z.rest, 60); assert.equal(z.est, false);
assert.deepEqual(z.zones.map(x => [x.z, x.lo, x.hi]), [[1, 124, 136], [2, 137, 149], [3, 150, 162], [4, 163, 174], [5, 175, 187]]);
assert.deepEqual(z.zones.map(x => x.n), ['Regeneration', 'Grundlage', 'Aerob', 'Schwelle', 'Maximal']);
assert.ok(z.zones.every(x => typeof x.txt === 'string' && x.txt.length > 5));
z.zones.forEach((x, i) => { assert.ok(x.lo <= x.hi); if (i) assert.equal(x.lo, z.zones[i - 1].hi + 1, 'lückenlos'); });
// Ohne Ruhepuls: 60 angenommen, als Schätzung markiert
const e = hrZones({ age: 30 });
assert.equal(e.est, true); assert.equal(e.rest, 60); assert.deepEqual(e.zones, z.zones);
assert.equal(hrZones({ age: '30', rest: '' }).est, true);
// Gemessener Maximalpuls hat Vorrang, Alter dann optional
const m = hrZones({ age: 30, rest: 50, max: 195 });
assert.equal(m.max, 195); assert.equal(m.zones[4].hi, 195); assert.equal(m.zones[0].lo, 123);
assert.equal(hrZones({ rest: 50, max: 195 }).max, 195);
for (const bad of [{}, { age: 9 }, { age: 101 }, { age: 'x' }, { age: 30, rest: 29 }, { age: 30, rest: 111 }, { age: 30, max: 119 },
  { age: 30, max: 231 }, { age: 5, max: 190 }, { rest: 60 }]) assert.equal(hrZones(bad), null, JSON.stringify(bad));
assert.equal(hrZones(), null);

// Zonen für alle Abschnitte und Einheiten aus run.js
for (const k of Object.keys(SEG)) {
  const r = segZone(k);
  assert.ok(Array.isArray(r) && r.length === 2 && r[0] >= 1 && r[0] <= r[1] && r[1] <= 5, k);
}
for (const k of Object.keys(SESSIONS)) {
  const r = sessZone(k);
  assert.ok(Array.isArray(r) && r.length === 2 && r[0] >= 1 && r[0] <= r[1] && r[1] <= 5, k);
}
assert.deepEqual(segZone('work'), [4, 5]); assert.deepEqual(segZone('run'), [2, 2]); assert.deepEqual(segZone('walk'), [1, 1]);
assert.deepEqual(sessZone('int'), [4, 5]); assert.deepEqual(sessZone('easy'), [2, 2]);
assert.equal(segZone('x'), null); assert.equal(sessZone(undefined), null);

// Körperwerte
assert.deepEqual(normBody({ date: '2026-11-01', kg: '81,45', waist: 90, fat: '18,5', chest: '', arm: 29, hip: 'abc' }),
  { date: '2026-11-01', kg: 81.5, waist: 90, fat: 18.5, chest: null, arm: null, hip: null });
assert.deepEqual(normBody({ date: 'd', hip: '101' }), { date: 'd', kg: null, waist: null, fat: null, chest: null, arm: null, hip: 101 });
assert.equal(normBody({ date: 'd', kg: 29, fat: 61, waist: 251 }), null);
assert.equal(normBody({}), null);
assert.equal(normBody(null), null);
assert.ok(normBody({ kg: 300 }).date, 'Datum ergänzt');
assert.equal(normBody({ fat: 3 }).fat, 3); assert.equal(normBody({ fat: 2.9 }), null);

const now = new Date('2026-11-09T12:00:00Z');
const body = [
  { date: '2026-11-08T08:00:00Z', kg: 80, waist: null },
  { date: '2026-09-20T08:00:00Z', kg: 84 },
  { date: '2026-10-10T08:00:00Z', kg: 82.4, waist: 92 },
  { date: '2026-11-05T08:00:00Z', kg: 80.6 },
  { date: '2026-10-25T08:00:00Z', kg: 81 },
];
const st = bodyStats(body, 'kg', now);
assert.deepEqual(st.series.map(x => x.v), [84, 82.4, 81, 80.6, 80]);
assert.equal(st.last, 80); assert.equal(st.first, 84);
assert.equal(st.change4w, -2.4, 'gegen den 10.10. (letzter Wert ≥ 28 Tage alt)');
assert.equal(st.avg7, 80.3);
const ws = bodyStats(body, 'waist', now);
assert.deepEqual(ws.series, [{ date: '2026-10-10T08:00:00Z', v: 92 }]);
assert.equal(ws.change4w, null, 'nur ein Wert: keine Änderung'); assert.equal(ws.avg7, null);
assert.deepEqual(bodyStats([], 'kg', now), { last: null, first: null, change4w: null, avg7: null, series: [] });
assert.equal(bodyStats([{ date: '2026-11-01', kg: 80 }], 'kg', now).change4w, null, 'noch keine 4 Wochen');

// Ernährung
assert.equal(activity(0), 1.3); assert.equal(activity(1), 1.3); assert.equal(activity(4), 1.5); assert.equal(activity(7), 1.7); assert.equal(activity(20), 1.7);
const n1 = nutrition({ sex: 'm', age: 30, cm: 180, kg: 80, goal: 'muskel', days: 4, time: '60' });
assert.equal(n1.bmr, 1780); assert.equal(n1.tdee, 2670); assert.equal(n1.kcal, 2900);
assert.deepEqual(n1.protein, [128, 176]); assert.equal(n1.water, 2.8);
assert.ok(/keine medizinische Beratung/.test(n1.note));
// Tage auch als wd-Array
assert.deepEqual(nutrition({ sex: 'm', age: 30, cm: 180, kg: 80, goal: 'muskel', days: ['0', '2', '4', '5'], time: 60 }), n1);
const n2 = nutrition({ sex: 'w', age: 40, cm: 165, kg: 70, goal: 'abnehmen', days: 3, time: 45 });
assert.equal(n2.bmr, 1370); assert.equal(n2.tdee, 1891); assert.equal(n2.kcal, 1600);
assert.deepEqual(n2.protein, [126, 154]); assert.ok(Math.abs(n2.water - 2.5) < 1e-9);
// Alle Ziele aus data.js: plausibel, durch 50 teilbar, nie unter dem Grundumsatz
const goals = QUESTIONS.find(q => q.f === 'goal').o.map(o => o[0]);
for (const goal of goals) for (const sex of ['m', 'w']) for (const [kg, days, time] of [[45, 0, 30], [70, 3, 60], [120, 6, 75]]) {
  const r = nutrition({ sex, age: 35, cm: 170, kg, goal, days, time }), at = `${goal}/${sex}/${kg}`;
  assert.ok(r.kcal % 50 === 0 && r.kcal >= r.bmr && r.tdee > r.bmr, at);
  assert.ok(r.kcal > 1000 && r.kcal < 5000, at);
  assert.ok(r.protein[0] < r.protein[1] && r.protein[0] >= 1.4 * kg - 1 && r.protein[1] <= 2.2 * kg + 1, at);
  const diff = r.kcal - r.tdee;
  if (goal === 'abnehmen') assert.ok(diff < -150, at);
  else if (goal === 'muskel') assert.ok(Math.abs(diff - 250) <= 25, at);
  else if (goal === 'kraft') assert.ok(Math.abs(diff - 150) <= 25, at);
  else assert.ok(Math.abs(diff) <= 25, at);
}
// Frau mit gleichen Maßen hat 166 kcal weniger Grundumsatz
const base = { age: 35, cm: 170, kg: 70, goal: 'fitness', days: 3, time: 60 };
assert.equal(nutrition({ ...base, sex: 'm' }).bmr - nutrition({ ...base, sex: 'w' }).bmr, 166);
// Komma-Eingaben
assert.equal(nutrition({ ...base, sex: 'w', kg: '70,0' }).bmr, nutrition({ ...base, sex: 'w' }).bmr);
for (const bad of [{ sex: 'x' }, { sex: 'm', age: 13 }, { sex: 'm', age: 101 }, { sex: 'm', cm: 100 }, { sex: 'm', kg: 20 },
  { sex: 'm', kg: '' }, { sex: 'm', days: 8 }, { sex: 'm', days: -1 }, { sex: 'm', time: 'x' }, { sex: 'm', time: 301 }])
  assert.equal(nutrition({ ...base, ...bad }), null, JSON.stringify(bad));
assert.equal(nutrition(), null);

console.log('OK: Puls, Körperwerte und Ernährung geprüft');
