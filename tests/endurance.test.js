// Selbsttest für das Ausdauer-Tracking
// Aufruf: node tests/endurance.test.js
import assert from 'node:assert/strict';
import { normalize, pace, points, summary, weekStart, WEEK_GOAL } from '../js/endurance.js';

// Eingaben: Dauer ist Pflicht, unsinnige Werte werden verworfen, Komma geht als Dezimalzeichen
assert.equal(normalize({ act: 'lauf', min: '' }), null);
assert.equal(normalize({ act: 'lauf', min: '0' }), null);
const e = normalize({ act: 'lauf', min: '30', km: '5,5', hr: '300', rpe: '6' });
assert.deepEqual([e.min, e.km, e.hr, e.rpe, e.src], [30, 5.5, null, 6, 'frei']);
assert.equal(normalize({ act: 'quatsch', min: 10 }).act, 'sonst');

// Tempo
assert.equal(pace({ act: 'lauf', min: 30, km: 5 }), '6:00 /km');
assert.equal(pace({ act: 'rad', min: 60, km: 25 }), '25,0 km/h');
assert.equal(pace({ act: 'lauf', min: 30, km: null }), '');

// Intensive Minuten zählen doppelt
assert.equal(points({ min: 20, rpe: 8 }), 40);
assert.equal(points({ min: 20, rpe: 5 }), 20);
assert.equal(points({ min: 20, rpe: null }), 20);

// Woche beginnt am Montag
assert.equal(weekStart(new Date(2026, 10, 15, 18)).getDate(), 9); // So 15.11. -> Mo 9.11.
assert.equal(weekStart(new Date(2026, 10, 9, 0, 30)).getDate(), 9);

// Zusammenfassung über Wochen
{
  const now = new Date(2026, 10, 12, 12); // Do
  const at = (d, x) => normalize({ date: new Date(2026, 10, d, 12).toISOString(), ...x });
  const E = [
    at(10, { act: 'lauf', min: 40, km: 8, hr: 150, rpe: 5 }),
    at(11, { act: 'zirkel', min: 10, rpe: 8 }),
    at(3, { act: 'lauf', min: 30, km: 5, rpe: 6 }),
    at(1, { act: 'rad', min: 60, km: 20 }),
    normalize({ date: new Date(2026, 5, 1).toISOString(), act: 'gehen', min: 45 }), // außerhalb der 8 Wochen
  ];
  const s = summary(E, now);
  assert.equal(s.weeks.length, 8);
  assert.deepEqual([s.week.n, s.week.min, s.week.pts], [2, 50, 60]);
  assert.equal(s.goal, Math.round(60 / WEEK_GOAL * 100));
  assert.deepEqual([s.weeks[6].n, s.weeks[6].min], [1, 30]); // 2.–8.11.
  assert.deepEqual([s.weeks[5].n, s.weeks[5].min], [1, 60]); // 26.10.–1.11.
  assert.deepEqual([s.total.n, s.total.min, s.total.km], [5, 185, 33]);
  assert.equal(s.hr, 150);
  assert.equal(s.best.km, 8); // 5:00 /km ist schneller als 6:00 /km
  assert.equal(summary([], now).goal, 0);
  // Ziel wird bei 100 % gedeckelt
  assert.equal(summary([at(12, { act: 'lauf', min: 200 })], now).goal, 100);
}

console.log('OK: Ausdauer-Tracking geprüft');
