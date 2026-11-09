// Selbsttest für Aufwärmen und Dehnen
// Aufruf: node tests/mobility.test.js
import assert from 'node:assert/strict';
import { QUESTIONS, SCHEDULE, DEFAULT } from '../js/data.js';
import { buildPlan } from '../js/plan.js';
import { warmupFor, stretchFor, mobMinutes } from '../js/mobility.js';

const opts = f => QUESTIONS.find(q => q.f === f).o.map(o => o[0]);
const TOOLS = opts('tools');
const ids = list => list.map(x => x.id);

// Felder, Typen, Textlängen, keine doppelten ids
function checkItems(list, at) {
  assert.equal(new Set(ids(list)).size, list.length, `${at}: doppelte id ${ids(list)}`);
  for (const x of list) {
    assert.deepEqual(Object.keys(x).sort(), ['cue', 'id', 'n', 'sec', 'side', 'txt'], `${at} ${x.id}`);
    assert.ok(typeof x.id === 'string' && x.id, at);
    assert.ok(typeof x.n === 'string' && x.n, at);
    assert.ok(Number.isInteger(x.sec) && x.sec >= 0, `${at} ${x.id}`);
    assert.equal(typeof x.side, 'boolean', at);
    assert.ok(typeof x.txt === 'string' && x.txt.length > 10 && x.txt.length <= 110, `${at} ${x.id}: txt ${x.txt.length} Zeichen`);
    assert.ok(typeof x.cue === 'string' && x.cue.length > 5 && x.cue.length <= 70, `${at} ${x.id}: cue ${x.cue.length} Zeichen`);
    if (x.side) assert.equal(x.sec % 2, 0, `${at} ${x.id}: Seiten ungleich`);
  }
}
function checkStretch(list, at) {
  checkItems(list, at);
  assert.ok(list.length >= 4 && list.length <= 6, `${at}: ${list.length} Dehnungen`);
  const m = mobMinutes(list);
  assert.ok(m >= 4 && m <= 6, `${at}: Dehnen ${m} min`);
  for (const x of list) assert.equal(x.sec, x.side ? 60 : 45, `${at} ${x.id}`);
}

// Alle Profile wie in tests/test.js, alle Tage aus buildPlan
let days = 0;
const seen = new Set();
for (const goal of opts('goal')) for (const focus of opts('focus')) for (const level of opts('level'))
  for (const n of ['2', '3', '4', '5', '6']) for (const time of opts('time')) for (const tools of [[], ['kb'], ['kb', 'stange'], TOOLS]) {
    const p = { goal, focus, level, wd: SCHEDULE[n].map(String), time, tools };
    for (const d of buildPlan(p).days) {
      days++;
      const at = `${goal}/${focus}/${level}/${n}/${time}/${tools.join('+')}/${d.name}`;
      const w = warmupFor(d, p), s = stretchFor(d, p);
      checkItems(w, at);
      checkStretch(s, at);
      const m = mobMinutes(w);
      if (d.kind === 'lift') {
        assert.ok(m >= 5 && m <= 7, `${at}: Aufwärmen ${m} min`);
        assert.ok(w.length >= 5 && w.length <= 6, `${at}: ${w.length} Aufwärm-Items`);
        // Puls zuerst, Rampensatz zuletzt und nur dort sec 0
        assert.ok(w[0].sec >= 60 && w[0].sec <= 120, at);
        const ramp = w.at(-1), first = (d.rows.find(r => r.main) || d.rows[0]).ex;
        assert.equal(ramp.sec, 0, at);
        assert.equal(ramp.n, `Rampensätze: ${first.n}`, at);
        assert.equal(w.filter(x => x.sec === 0).length, 1, at);
        // ohne Springseil kein Seilspringen, ohne Stange keine Übung an der Stange
        assert.equal(ids(w).includes('w-seil'), tools.includes('seil'), at);
        if (!tools.includes('stange')) assert.ok(!ids(w).includes('m-skapula-hang'), at);
      } else {
        assert.ok(m >= 4 && m <= 6, `${at}: Aufwärmen ${m} min`);
        assert.ok(w.every(x => x.sec > 0), at);
      }
      seen.add(ids(w).join());
      // deterministisch
      assert.deepEqual(warmupFor(d, p), w); assert.deepEqual(stretchFor(d, p), s);
    }
  }
assert.ok(seen.size > 20, `nur ${seen.size} verschiedene Aufwärmprogramme`);

// Cardio- und Lauf-Einheiten
for (const [kind, keys] of [['cardio', ['z2', 'hiit']], ['run', ['easy', 'long', 'int', 'tempo', 'walk']]]) for (const key of keys) {
  const d = { kind, key, rows: [] }, at = `${kind}/${key}`;
  for (const p of [DEFAULT, undefined, { ...DEFAULT, tools: TOOLS }]) {
    const w = warmupFor(d, p), s = stretchFor(d, p);
    checkItems(w, at); checkStretch(s, at);
    const m = mobMinutes(w);
    assert.ok(m >= 4 && m <= 6, `${at}: Aufwärmen ${m} min`);
    assert.ok(w.every(x => x.sec > 0 && !x.n.startsWith('Rampensätze')), at);
    // Läufer dehnen Waden, Hüftbeuger, Oberschenkel und Gesäß
    for (const id of ['d-wade', 'd-hueftbeuger', 'd-quad', 'd-hamstring', 'd-gesaess']) assert.ok(ids(s).includes(id), `${at}: ${id} fehlt`);
  }
  // Intensive Einheiten mit Steigerungsläufen
  assert.equal(ids(warmupFor(d, DEFAULT)).includes('w-steiger'), ['hiit', 'int', 'tempo'].includes(key), at);
}
assert.ok(mobMinutes(warmupFor({ kind: 'run', key: 'walk' })) < mobMinutes(warmupFor({ kind: 'run', key: 'int' })) + 1);

// Oberkörper und Beine ergeben verschiedene Programme
{
  const plan = buildPlan({ ...DEFAULT, focus: 'aus', wd: ['0', '1', '3', '4'] }); // O U O U
  const O = plan.days.find(d => d.key === 'O'), U = plan.days.find(d => d.key === 'U');
  const wo = ids(warmupFor(O, DEFAULT)), wu = ids(warmupFor(U, DEFAULT));
  const so = ids(stretchFor(O, DEFAULT)), su = ids(stretchFor(U, DEFAULT));
  const common = (a, b) => a.filter(x => b.includes(x) && !['w-stelle', 'w-rampe'].includes(x));
  assert.deepEqual(common(wo, wu), [], `${wo} / ${wu}`);
  assert.deepEqual(common(so, su), [], `${so} / ${su}`);
  // Beine: Hüfte/Gesäß/Oberschenkel; Oberkörper: Brust/Schulter/Lat
  for (const id of ['d-hueftbeuger', 'd-quad', 'd-hamstring', 'd-gesaess']) assert.ok(su.includes(id), `Beintag ohne ${id}`);
  for (const id of ['d-brust', 'd-schulter', 'd-lat']) assert.ok(so.includes(id), `Oberkörper ohne ${id}`);
  assert.ok(wu.includes('m-hocke') && wo.includes('m-openbook'));
  // Push und Pull unterscheiden sich ebenfalls
  const ppl = buildPlan({ ...DEFAULT, focus: 'aus', wd: ['0', '1', '2', '3', '4'] }).days;
  const P = ppl.find(d => d.key === 'P'), Z = ppl.find(d => d.key === 'Z');
  assert.notDeepEqual(ids(warmupFor(P, DEFAULT)), ids(warmupFor(Z, DEFAULT)));
  assert.notDeepEqual(ids(stretchFor(P, DEFAULT)), ids(stretchFor(Z, DEFAULT)));
}

// Puls-Teil je nach Gerät und Niveau; Rampensatz-Text je nach Übung und Ziel
{
  const d = buildPlan(DEFAULT).days[0];
  assert.equal(warmupFor(d, { ...DEFAULT, tools: [...DEFAULT.tools, 'seil'] })[0].id, 'w-seil');
  assert.equal(warmupFor(d, { ...DEFAULT, tools: ['cardio'] })[0].id, 'w-geraet');
  assert.equal(warmupFor(d, { ...DEFAULT, level: '1' })[0].id, 'w-stelle');
  assert.equal(warmupFor(d, { ...DEFAULT, level: '2' })[0].id, 'w-hampel');
  const ramp = (ex, goal = 'fitness') => warmupFor({ kind: 'lift', key: 'O', rows: [{ ex, main: true }] }, { ...DEFAULT, goal }).at(-1).txt;
  const bw = { id: 'pushup', n: 'Liegestütze', p: 'hpush', t: [] }, bb = { id: 'bench', n: 'Bankdrücken', p: 'hpush', t: ['lh', 'bank'] };
  assert.doesNotMatch(ramp(bw), /%/);
  assert.match(ramp(bb), /50 %.*70 %/);
  assert.match(ramp(bb, 'kraft'), /85 %/);
  assert.match(ramp({ id: 'kb-press', n: 'KB Press', p: 'vpush', t: ['kb'] }), /Kettlebell/);
  // Ohne Hauptübung wird die erste Übung genommen
  assert.equal(warmupFor({ kind: 'lift', key: 'O', rows: [{ ex: bw, main: false }, { ex: bb, main: false }] }, DEFAULT).at(-1).n, 'Rampensätze: Liegestütze');
  // Klimmzugstange ermöglicht Schulterblatt-Klimmzüge am Zugtag
  const Z = buildPlan({ ...DEFAULT, focus: 'aus', wd: ['0', '1', '2', '3', '4'], tools: ['stange'] }).days.find(x => x.key === 'Z');
  assert.ok(ids(warmupFor(Z, { ...DEFAULT, tools: ['stange'] })).includes('m-skapula-hang'));
  assert.ok(!ids(warmupFor(Z, { ...DEFAULT, tools: [] })).includes('m-skapula-hang'));
}

// mobMinutes: sec 0 zählt als 60 s
assert.equal(mobMinutes([]), 0);
assert.equal(mobMinutes([{ sec: 0 }]), 1);
assert.equal(mobMinutes([{ sec: 90 }, { sec: 0 }]), 3); // 150 s ≈ 2,5 → 3
assert.equal(mobMinutes([{ sec: 60 }, { sec: 45 }]), 2);

console.log(`OK: Aufwärmen und Dehnen für ${days} Trainingstage geprüft`);
