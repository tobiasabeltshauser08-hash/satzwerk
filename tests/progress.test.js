// Selbsttest für Log-Format 2, Blockwechsel, Wochenwechsel, Kraft-Fortschritt, Backup-Erinnerung und Laufplan-Fortsetzung
// Aufruf: node tests/progress.test.js
import assert from 'node:assert/strict';
import { migrateLog, lastEntry, key, mondayOf, shouldAdvance, epley, progressOf, progressList, loggedIds, backupDue, nextRunPlan, LOG_V } from '../js/progress.js';

// Migration Format 1 → 2
{
  const S = { log: { '0-1-0': { sets: [true], kg: '20', reps: [10] }, '2-1-f': { sets: [true] }, '1-0-c0': { sets: [true] }, kaputt: {} }, active: { w: 1, di: 0 } };
  migrateLog(S, (d, r) => (d === 1 && r === 0 ? 'kh-goblet' : null));
  assert.deepEqual(Object.keys(S.log).sort(), ['0-0-1-0', '0-1-0-c0', '0-2-1-f']);
  assert.equal(S.log['0-0-1-0'].id, 'kh-goblet');
  assert.equal(S.log['0-2-1-f'].id, undefined);
  assert.equal(S.block, 0);
  assert.equal(S.active.b, 0);
  assert.equal(S.logV, LOG_V);
  // zweiter Aufruf ändert nichts
  const before = JSON.stringify(S);
  migrateLog(S, () => 'x');
  assert.equal(JSON.stringify(S), before);
  // leeres Log
  assert.deepEqual(migrateLog({}, () => null).log, {});
}

// Letzter Eintrag: frühere Woche, dann früherer Block ohne Deload; nur dieselbe Übung
{
  const log = {
    [key(0, 0, 1, 0)]: { sets: [true], kg: '20', reps: [10], id: 'squat' },
    [key(0, 2, 1, 0)]: { sets: [true], kg: '24', reps: [8], id: 'squat' },
    [key(0, 3, 1, 0)]: { sets: [true], kg: '20', reps: [8], id: 'squat' },   // Deload
    [key(0, 2, 1, 1)]: { sets: [true], kg: '12', reps: [10], id: 'row' },
  };
  assert.equal(lastEntry(log, { b: 0, w: 3, di: 1, ri: 0, id: 'squat' }).kg, '24');
  const nb = lastEntry(log, { b: 1, w: 0, di: 1, ri: 0, id: 'squat' });
  assert.equal(nb.kg, '24'); assert.equal(nb.b, 0); assert.equal(nb.w, 2);
  // Übung getauscht: an Stelle 0 steht jetzt „press“ → kein Eintrag der alten Übung
  assert.equal(lastEntry(log, { b: 1, w: 0, di: 1, ri: 0, id: 'press' }), null);
  // Übung an andere Stelle gerutscht: wird am selben Tag gefunden
  assert.equal(lastEntry(log, { b: 1, w: 0, di: 1, ri: 3, id: 'row' }).kg, '12');
  // anderer Tag zählt nicht
  assert.equal(lastEntry(log, { b: 1, w: 0, di: 2, ri: 0, id: 'squat' }), null);
  // Woche 0, Block 0: nichts davor
  assert.equal(lastEntry(log, { b: 0, w: 0, di: 1, ri: 0, id: 'squat' }), null);
  // alte Einträge ohne id passen weiter (Stelle gleich)
  assert.equal(lastEntry({ [key(0, 0, 0, 0)]: { kg: '5', reps: [8] } }, { b: 0, w: 1, di: 0, ri: 0, id: 'x' }).kg, '5');
  // leere Einträge werden übersprungen
  assert.equal(lastEntry({ [key(0, 1, 0, 0)]: { sets: [], kg: '', reps: [], id: 'a' }, [key(0, 0, 0, 0)]: { kg: '7', reps: [5], id: 'a' } }, { b: 0, w: 2, di: 0, ri: 0, id: 'a' }).kg, '7');
}

// Wochenwechsel nach Kalender
{
  assert.equal(mondayOf(new Date(2026, 10, 10, 9)), '2026-11-09');   // Di
  assert.equal(mondayOf(new Date(2026, 10, 9, 0, 5)), '2026-11-09');  // Mo früh
  assert.equal(mondayOf(new Date(2026, 10, 15, 23)), '2026-11-09');   // So spät
  assert.equal(mondayOf(new Date(2027, 0, 1)), '2026-12-28');
  const base = { week: 1, last: 3, since: '2026-11-02', trained: true, now: new Date(2026, 10, 10) };
  assert.equal(shouldAdvance(base), true);
  assert.equal(shouldAdvance({ ...base, trained: false }), false);
  assert.equal(shouldAdvance({ ...base, week: 3 }), false);
  assert.equal(shouldAdvance({ ...base, since: '2026-11-09' }), false);
  assert.equal(shouldAdvance({ ...base, since: null }), false);
}

// Kraft-Fortschritt
{
  assert.equal(epley(100, 1), 100);
  assert.equal(Math.round(epley(60, 10) * 10) / 10, 80);
  assert.equal(epley(0, 10), null);
  assert.equal(epley(50, 20), null);
  const log = {
    [key(0, 0, 0, 0)]: { sets: [true, true], kg: '40', reps: [10, 8], id: 'squat' },
    [key(0, 1, 0, 0)]: { sets: [true, true], kg: '42,5', reps: [10, 10], id: 'squat' },
    [key(1, 0, 0, 0)]: { sets: [true], kg: '45', reps: [9], id: 'squat' },
    [key(0, 0, 0, 1)]: { sets: [true, true], kg: '', reps: [12, 15], id: 'pushup' },
    [key(0, 1, 0, 1)]: { sets: [true], kg: '', reps: [16], id: 'pushup' },
    [key(0, 0, 0, 2)]: { sets: [true], kg: '', reps: [40], id: 'plank' },
    [key(0, 1, 0, 3)]: { sets: [false], kg: '30', reps: [8], id: 'skip' },   // nicht abgehakt
    [key(0, 3, 0, 0)]: { sets: [true], kg: '40', reps: [8], id: 'squat' },   // Deload zählt nicht
  };
  const sq = progressOf(log, 'squat');
  assert.equal(sq.unit, 'kg');
  assert.deepEqual(sq.points.map(p => p.v), [53.3, 56.7, 58.5]);
  assert.deepEqual(sq.points.map(p => [p.b, p.w]), [[0, 0], [0, 1], [1, 0]]);
  const pu = progressOf(log, 'pushup');
  assert.equal(pu.unit, 'Wdh.');
  assert.deepEqual(pu.points.map(p => p.v), [15, 16]);
  assert.equal(progressOf(log, 'plank', true).unit, 's');
  assert.deepEqual(progressOf(log, 'skip').points, []);
  assert.deepEqual(progressOf(log, 'gibtsnicht').points, []);
  const list = progressList(log, loggedIds(log), id => id === 'plank');
  assert.deepEqual(list.map(x => x.id), ['squat', 'pushup', 'plank']);
  assert.equal(list[0].change, 5.2);
  assert.equal(list[0].now, 58.5);
}

// Backup-Erinnerung
{
  const h = [{ date: '2026-09-01T10:00:00Z' }, {}, {}];
  const now = new Date('2026-11-10T10:00:00Z');
  assert.equal(backupDue({ history: h.slice(0, 2), now }), false);
  assert.equal(backupDue({ history: h, now }), true);
  assert.equal(backupDue({ history: h, lastBackup: '2026-11-01T00:00:00Z', now }), false);
  assert.equal(backupDue({ history: h, lastBackup: '2026-10-01T00:00:00Z', now }), true);
  assert.equal(backupDue({ history: h, snooze: '2026-11-08T00:00:00Z', now }), false);
  assert.equal(backupDue({ history: h, snooze: '2026-10-20T00:00:00Z', now }), true);
}

// Laufplan fortsetzen
{
  assert.deepEqual(nextRunPlan({ goal: 'start', level: '1', wd: [1, 3, 6], t5: null }, null), { goal: 'fit', level: '2', wd: [1, 3, 6], t5: null });
  assert.deepEqual(nextRunPlan({ goal: '5k', level: '3', wd: [0], t5: 1700 }, 1620), { goal: '10k', level: '3', wd: [0], t5: 1620 });
  assert.equal(nextRunPlan({ goal: 'hm', level: '2', wd: [0], t5: 1500 }, 1600).t5, 1500);   // langsamere Bestzeit ersetzt nicht
  assert.equal(nextRunPlan({ goal: 'hm', level: '2', wd: [0] }, null).goal, 'hm');
}

console.log('OK: Log, Blöcke, Wochenwechsel, Fortschritt, Backup-Erinnerung und Laufplan-Fortsetzung geprüft');
