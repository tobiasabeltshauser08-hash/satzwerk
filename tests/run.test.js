// Selbsttest für den Lauf-Bereich (Plan, Zeitleiste, Tempo, GPS-Strecke, Kilometer)
// Aufruf: node tests/run.test.js
import assert from 'node:assert/strict';
import {
  RUN_GOALS, RUN_LEVELS, RUN_WEEKS, RUN_LOAD, RUN_PHASE, SESSIONS, runPhase,
  sessionKeys, segments, buildRunWeek, describe, longMin, totalSec, segAt,
  targetPace, fmtPace, parseTime, haversine, trackAdd, trackResume, kmStats, MAX_ACC,
} from '../js/run.js';

const GOALS = RUN_GOALS.map(g => g[0]), LEVELS = RUN_LEVELS.map(l => l[0]);
const DAYS = [1, 3, 5, 6, 2]; // Di, Do, Sa, So, Mi (0 = Montag)
assert.equal(RUN_LOAD.length, RUN_WEEKS);
assert.equal(RUN_PHASE.length, RUN_WEEKS);

// Plan: alle Ziele × Niveaus × 2–5 Lauftage × 8 Wochen
for (const goal of GOALS) for (const level of LEVELS) for (let n = 2; n <= 5; n++) {
  const p = { goal, level, wd: DAYS.slice(0, n) };
  const sum = [];
  for (let w = 0; w < RUN_WEEKS; w++) {
    const week = buildRunWeek(p, w), at = `${goal}/${level}/${n} Tage/Woche ${w}`;
    assert.equal(week.length, n, at);
    assert.deepEqual(week.map(s => s.wd), [...p.wd].sort((a, b) => a - b), at);
    for (const s of week) {
      assert.ok(SESSIONS[s.key], at);
      assert.equal(s.name, SESSIONS[s.key].n, at);
      assert.ok(s.segs.length > 0, at);
      assert.ok(s.segs.every(x => x.sec > 0 && Number.isFinite(x.sec)), `${at} ${s.key}`);
      assert.equal(s.min, Math.round(totalSec(s.segs) / 60), at);
      assert.ok(typeof s.text === 'string' && s.text.length > 0, at);
    }
    if (goal === 'start') assert.ok(week.every(s => s.key === 'walk'), at);
    else {
      assert.equal(week.at(-1).key, 'long', at);
      assert.equal(week.filter(s => s.key === 'long').length, 1, at);
      assert.equal(week.at(-1).min, longMin(p, w), at);
    }
    sum.push(week.reduce((a, s) => a + s.min, 0));
  }
  // Entlastungswochen sind kürzer als die Woche davor.
  // Ausnahme: bei „start“ ist die letzte Woche der 30-min-Lauf (siehe unten) und damit länger.
  assert.ok(sum[3] < sum[2], `${goal}/${level}/${n}: Woche 4 ${sum[3]} >= ${sum[2]}`);
  if (goal !== 'start') assert.ok(sum[7] < sum[6], `${goal}/${level}/${n}: Woche 8 ${sum[7]} >= ${sum[6]}`);
}

// Welche Einheiten
assert.deepEqual(sessionKeys('start', 2), ['walk', 'walk']);
assert.deepEqual(sessionKeys('5k', 2), ['int', 'long']);
assert.deepEqual(sessionKeys('hm', 5), ['easy', 'int', 'easy', 'tempo', 'long']);
// Fit bleiben: kein Intervalltag, höchstens ein Tempolauf
assert.deepEqual(sessionKeys('fit', 4), ['easy', 'tempo', 'easy', 'long']);
for (let n = 2; n <= 5; n++) assert.ok(!sessionKeys('fit', n).includes('int'));

// Ziel „start“, Woche 8: 30 min Laufen am Stück
{
  const segs = segments({ goal: 'start', level: '1' }, 'walk', 7);
  const runs = segs.filter(s => s.k === 'run');
  assert.deepEqual(runs.map(s => s.sec), [30 * 60]);
  assert.ok(!segs.some(s => s.k === 'walk'));
  assert.equal(describe(segs), '5 min Einlaufen · 30 min locker · 5 min Auslaufen');
  // Woche 1 beginnt mit Gehpausen
  assert.equal(describe(segments({ goal: 'start', level: '1' }, 'walk', 0)), '5 min Einlaufen · 8 × 1 min laufen / 2 min gehen · 5 min Auslaufen');
}

// describe
{
  const segs = segments({ goal: '5k', level: '2' }, 'int', 2);
  assert.equal(describe(segs), '15 min Einlaufen · 5 × 3 min schnell / 2 min Trab · 10 min Auslaufen');
  assert.equal(describe(segments({ goal: '5k', level: '2' }, 'int', 1)), '15 min Einlaufen · 5 × 2 min schnell / 1:30 min Trab · 10 min Auslaufen');
  assert.equal(describe([{ k: 'work', sec: 45 }]), '45 s schnell');
  assert.equal(describe([{ k: 'run', sec: 1800 }]), '30 min locker');
  // Tempo-Blöcke mit Trabpause
  assert.equal(describe(segments({ goal: '10k', level: '2' }, 'tempo', 2)), '15 min Einlaufen · 2 × 10 min Tempo / 3 min Trab · 10 min Auslaufen');
  // Ungleich lange Blöcke werden nicht zusammengefasst
  assert.equal(describe([{ k: 'work', sec: 60 }, { k: 'rest', sec: 60 }, { k: 'work', sec: 120 }]), '1 min schnell · 1 min Traben · 2 min schnell');
}

// Niveau verändert Longrun und Intervalle
assert.equal(longMin({ goal: 'hm', level: '3' }, 6), 115); // (80 + 20) × 1,15
assert.equal(longMin({ goal: 'fit', level: '1' }, 3), 30);
assert.ok(segments({ goal: '5k', level: '3' }, 'int', 0).filter(s => s.k === 'work').length >
  segments({ goal: '5k', level: '1' }, 'int', 0).filter(s => s.k === 'work').length);

// segAt an den Grenzen
{
  const segs = [{ k: 'warm', sec: 60 }, { k: 'work', sec: 120 }];
  assert.deepEqual(segAt(segs, 0), { i: 0, left: 60, into: 0 });
  assert.deepEqual(segAt(segs, 59), { i: 0, left: 1, into: 59 });
  assert.deepEqual(segAt(segs, 60), { i: 1, left: 120, into: 0 });
  assert.deepEqual(segAt(segs, 179), { i: 1, left: 1, into: 119 });
  assert.deepEqual(segAt(segs, 180), { i: segs.length, left: 0, into: 0, over: 0 });
  assert.equal(segAt(segs, 200).over, 20);
  assert.equal(segAt([], 5).i, 0);
}

// parseTime, fmtPace, targetPace
assert.equal(parseTime('25:30'), 1530);
assert.equal(parseTime('25'), 1500);
assert.equal(parseTime(' 19:05 '), 1145);
assert.equal(parseTime('5'), null);        // unter 12 min
assert.equal(parseTime('abc'), null);
assert.equal(parseTime(''), null);
assert.equal(parseTime(null), null);
assert.equal(parseTime('25:'), null);
assert.equal(parseTime('-25'), null);
assert.equal(parseTime('1:02:00'), null);  // über 60 min
assert.equal(parseTime('0:45:00'), 2700);
assert.equal(parseTime('12'), 720);
assert.equal(parseTime('60'), 3600);
assert.equal(parseTime('25:75'), null);    // Sekunden ab 60 sind ungültig
assert.equal(parseTime('0:60:00'), null);
assert.equal(fmtPace(300), '5:00');
assert.equal(fmtPace(375), '6:15');
assert.equal(fmtPace(65), '1:05');
assert.equal(fmtPace(null), '–');
assert.equal(fmtPace(0), '–');
assert.equal(fmtPace(359.7), '6:00');      // erst runden, dann teilen
assert.equal(fmtPace(359.4), '5:59');
assert.equal(fmtPace(Infinity), '–');

// Phase je Woche; bei „start“ ist die letzte Woche das Ziel
assert.equal(runPhase('start', 7), 'Ziel: 30 min');
assert.equal(runPhase('5k', 7), RUN_PHASE[7]);
assert.equal(runPhase('5k', 7), 'Lockern');
assert.equal(runPhase('start', 3), 'Entlastung');
// 25:00 auf 5 km = 5:00 /km
assert.equal(targetPace(1500, 'run', '5k'), 375);
assert.equal(targetPace(1500, 'work', '5k'), 294);
assert.equal(targetPace(1500, 'work', '10k'), 309);  // 10-km-Tempo
assert.equal(targetPace(1500, 'work', 'hm'), 309);
assert.equal(targetPace(1500, 'tempo', 'hm'), 321);
assert.equal(targetPace(1500, 'walk', '5k'), null);  // Gehen ohne Tempo
assert.equal(targetPace(null, 'run', '5k'), null);
assert.equal(targetPace(1500, 'quatsch', '5k'), null);
assert.ok(targetPace(1500, 'work', '5k') < targetPace(1500, 'tempo', '5k'));
assert.ok(targetPace(1500, 'tempo', '5k') < targetPace(1500, 'run', '5k'));
assert.ok(targetPace(1500, 'run', '5k') < targetPace(1500, 'rest', '5k'));

// haversine: 0,01° Breite ≈ 1112 m
{
  const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} statt ≈ ${b}`);
  near(haversine({ lat: 48, lon: 11 }, { lat: 48.01, lon: 11 }), 1112, 2);
  near(haversine({ lat: 0, lon: 0 }, { lat: 0, lon: 0.01 }), 1112, 2);
  near(haversine({ lat: 60, lon: 11 }, { lat: 60, lon: 11.01 }), 556, 2); // cos 60° = 0,5
  assert.equal(haversine({ lat: 48, lon: 11 }, { lat: 48, lon: 11 }), 0);
}

// trackAdd / trackResume
{
  const M_LAT = 1 / 111195; // 1 m in Grad Breite
  const fix = (m, s, acc = 10) => ({ lat: 48 + m * M_LAT, lon: 11, t: s * 1000, acc });
  const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} statt ≈ ${b}`);

  // Erster Punkt setzt nur den Anfang
  let tr = trackAdd({}, fix(0, 0));
  assert.equal(tr.m, 0);
  assert.ok(tr.last);
  // Ungenaue Punkte werden verworfen und gezählt
  let t2 = trackAdd(tr, fix(20, 5, MAX_ACC + 1));
  assert.equal(t2.m, 0); assert.equal(t2.bad, 1); assert.equal(t2.last, tr.last);
  t2 = trackAdd(t2, null);
  assert.equal(t2.bad, 2);
  t2 = trackAdd(t2, fix(20, 5));
  assert.equal(t2.bad, 0); near(t2.m, 20, 0.1);
  // Ungenauer erster Punkt setzt keinen Anfang
  assert.equal(trackAdd({}, fix(0, 0, 50)).last, undefined);
  // Sprung schneller als 12 m/s wird verworfen
  t2 = trackAdd(tr, fix(100, 5)); // 20 m/s
  assert.equal(t2.m, 0); assert.equal(t2.last, tr.last);
  // Gleicher oder älterer Zeitstempel zählt nicht
  assert.equal(trackAdd(tr, fix(10, 0)).m, 0);
  // Jitter unter 5 m zählt nicht, Bewegung sammelt sich bis über die Schwelle
  t2 = trackAdd(tr, fix(3, 3, 5));
  assert.equal(t2.m, 0); assert.equal(t2.last, tr.last);
  t2 = trackAdd(t2, fix(6, 6, 5));
  near(t2.m, 6, 0.1);
  // Bei schlechter Genauigkeit liegt die Schwelle bei der halben Genauigkeit
  assert.equal(trackAdd(trackAdd({}, fix(0, 0, 25)), fix(10, 5, 25)).m, 0);

  // Realistische Strecke: 101 Punkte im Abstand von 10 m alle 3 s ≈ 1 km
  tr = {};
  for (let i = 0; i <= 100; i++) tr = trackAdd(tr, fix(i * 10, i * 3));
  near(tr.m, 1000, 5);
  // Hin und her zittern im Stand bringt keine Strecke
  let still = trackAdd({}, fix(0, 0));
  for (let i = 1; i <= 50; i++) still = trackAdd(still, fix(i % 2 ? 2 : -2, i * 3));
  assert.equal(still.m, 0);

  // Pause: Strecke dazwischen zählt nicht
  tr = {};
  for (let i = 0; i <= 10; i++) tr = trackAdd(tr, fix(i * 10, i * 3)); // 100 m
  near(tr.m, 100, 1);
  tr = trackResume(tr);
  assert.equal(tr.last, null);
  near(tr.m, 100, 1);
  tr = trackAdd(tr, fix(500, 300)); // 400 m weiter, nach 4:30 min Pause
  near(tr.m, 100, 1);
  tr = trackAdd(tr, fix(510, 303));
  near(tr.m, 110, 1);
}

// Kilometer: nur Läufe mit km, Woche ab Montag, Jahr, längster Lauf
{
  const now = new Date(2026, 10, 12, 12); // Do 12.11.2026
  const at = (y, mo, d, x) => ({ date: new Date(y, mo, d, 12).toISOString(), ...x });
  const E = [
    at(2026, 10, 9, { act: 'lauf', km: 5 }),         // Mo, diese Woche
    at(2026, 10, 11, { act: 'lauf', km: 7.25 }),     // Mi, diese Woche
    at(2026, 10, 8, { act: 'lauf', km: 10 }),        // So, letzte Woche
    at(2026, 0, 1, { act: 'lauf', km: 3 }),          // 1.1., dieses Jahr
    at(2025, 11, 31, { act: 'lauf', km: 21.1 }),     // letztes Jahr
    at(2026, 10, 10, { act: 'rad', km: 40 }),        // kein Lauf
    at(2026, 10, 10, { act: 'lauf', km: null }),     // Lauf ohne km
    at(2026, 10, 10, { act: 'lauf' }),
  ];
  const s = kmStats(E, now);
  assert.deepEqual(s, { total: 46.35, week: 12.25, year: 25.25, runs: 5, longest: 21.1 });
  // Am Montag früh zählt nur der Montag zur Woche
  assert.equal(kmStats(E.slice(0, 1), new Date(2026, 10, 9, 0, 5)).week, 5);
  // Am Sonntag gehört der Sonntag noch zur alten Woche (ab Mo 2.11.)
  assert.equal(kmStats(E.slice(2), new Date(2026, 10, 8, 20)).week, 10);
  assert.equal(kmStats(E.slice(2), new Date(2026, 10, 9, 8)).week, 0);
  assert.deepEqual(kmStats([], now), { total: 0, week: 0, year: 0, runs: 0, longest: 0 });
}

console.log('OK: Lauf-Bereich geprüft');
