// Selbsttest für den Plan-Generator und die Übungsdaten.
// Aufruf: node tests/test.js
import assert from 'node:assert/strict';
import { EX, QUESTIONS, SPLITS, DEFAULT, SCHEDULE } from '../js/data.js';
import { buildPlan, prescription, minutes, candidates } from '../js/plan.js';
import { ANIMS } from '../js/figure.js';

const TOOLS = QUESTIONS.find(q => q.f === 'tools').o.map(o => o[0]);
const opts = f => QUESTIONS.find(q => q.f === f).o.map(o => o[0]);

// Jede Übung hat Anleitung, Hinweis und eine vorhandene Animation
const ids = new Set();
for (const e of EX) {
  assert.ok(!ids.has(e.id), `doppelte id ${e.id}`); ids.add(e.id);
  assert.equal(e.s.length, 3, `${e.id}: 3 Schritte erwartet`);
  assert.ok(e.c, `${e.id}: Hinweis fehlt`);
  assert.ok(ANIMS[e.a], `${e.id}: Animation ${e.a} fehlt`);
  for (const t of e.t) assert.ok(TOOLS.includes(t), `${e.id}: unbekanntes Gerät ${t}`);
}

// Mit Körpergewicht allein gibt es für jedes Muster eine Anfänger-Übung
for (const p of new Set(EX.map(e => e.p))) {
  assert.ok(candidates(p, { tools: [], level: '1' }).some(e => e.t.length === 0 && e.lvl === 1), `kein Körpergewicht-Einstieg für ${p}`);
}

// Alle Profilkombinationen ergeben einen gültigen Plan
let plans = 0;
for (const goal of opts('goal')) for (const focus of opts('focus')) for (const level of opts('level'))
  for (const days of ['2', '3', '4', '5', '6']) for (const time of opts('time')) for (const tools of [[], ['kb'], ['kb', 'stange'], TOOLS]) {
    const p = { goal, focus, level, wd: SCHEDULE[days].map(String), time, tools };
    const plan = buildPlan(p);
    plans++;
    assert.equal(plan.days.length, +days);
    assert.equal(plan.split, SPLITS[focus][days][0]);
    for (const d of plan.days) {
      if (d.kind === 'cardio') continue;
      assert.ok(d.rows.length >= 3, `${d.name}: zu wenige Übungen`);
      assert.equal(new Set(d.rows.map(r => r.ex.id)).size, d.rows.length, `${d.name}: Übung doppelt`);
      for (const r of d.rows) for (const t of r.ex.t) assert.ok(tools.includes(t), `${r.ex.n} braucht ${t}`);
      for (let w = 0; w < 4; w++) {
        for (const r of d.rows) {
          const x = prescription(p, r, w);
          assert.ok(x.sets >= 2 && x.lo > 0 && x.hi >= x.lo);
        }
        const m = minutes(p, d, w);
        assert.ok(m > 15 && m <= +time + 20, `${d.name} W${w + 1}: ${m} min bei ${time} min`);
      }
    }
  }

// Mein Profil: Oberkörper bekommt mehr Einheiten, Klimmzugstange wird genutzt
{
  const plan = buildPlan(DEFAULT);
  const upper = plan.days.filter(d => d.name.startsWith('Oberkörper')).length;
  assert.equal(upper, 2);
  assert.ok(plan.days.some(d => d.rows.some(r => r.ex.t.includes('stange'))), 'Klimmzugstange kommt nicht vor');
}

// Deload hat weniger Sätze als die Steigerungswoche
{
  const plan = buildPlan(DEFAULT), r = plan.days[0].rows[0];
  assert.ok(prescription(DEFAULT, r, 3).sets < prescription(DEFAULT, r, 2).sets);
}

// Eigene Wochentage: Dienstag und Donnerstag bleiben frei
{
  const plan = buildPlan({ ...DEFAULT, wd: ['5', '0', '4', '2'] });
  assert.deepEqual(plan.days.map(d => d.wd), [0, 2, 4, 5]);
  assert.ok(!plan.days.some(d => d.wd === 1 || d.wd === 3));
}
// Alte Profile mit Anzahl statt Wochentagen funktionieren weiter
assert.deepEqual(buildPlan({ ...DEFAULT, wd: undefined, days: '4' }).days.map(d => d.wd), SCHEDULE[4]);

console.log(`OK: ${EX.length} Übungen, ${plans} Profile geprüft`);

// Jede Übung hat eine ausführliche Anleitung
{
  const { HOWTO } = await import('../js/howto.js');
  for (const e of EX) {
    const h = HOWTO[e.id];
    assert.ok(h, `${e.id}: ausführliche Anleitung fehlt`);
    assert.ok(h.s.length >= 4 && h.s.length <= 6, `${e.id}: 4–6 Schritte erwartet`);
    assert.ok(h.m && h.b && h.v, `${e.id}: Muskeln, Atmung oder Anpassung fehlt`);
    assert.ok(h.f.length >= 2, `${e.id}: mindestens 2 typische Fehler`);
  }
  for (const id of Object.keys(HOWTO)) assert.ok(EX.some(e => e.id === id), `Anleitung für unbekannte Übung ${id}`);
  console.log(`OK: ${Object.keys(HOWTO).length} ausführliche Anleitungen`);
}
