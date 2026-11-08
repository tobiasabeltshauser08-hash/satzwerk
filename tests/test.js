// Selbsttest für den Plan-Generator und die Übungsdaten.
// Aufruf: node tests/test.js
import assert from 'node:assert/strict';
import { EX, QUESTIONS, SPLITS, DEFAULT } from '../js/data.js';
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
  for (const days of opts('days')) for (const time of opts('time')) for (const tools of [[], ['kb'], ['kb', 'stange'], TOOLS]) {
    const p = { goal, focus, level, days, time, tools };
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

console.log(`OK: ${EX.length} Übungen, ${plans} Profile geprüft`);
