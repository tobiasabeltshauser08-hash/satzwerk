// Selbsttest für Datensicherung und Kalender-Erinnerungen
// Aufruf: node tests/backup.test.js
import assert from 'node:assert/strict';
import { exportBackup, backupName, parseBackup, icsReminders, icsName, icsFold, icsText } from '../js/backup.js';

const profile = { goal: 'fitness', focus: 'ober', level: '1', wd: ['0', '2', '4'], time: '60', tools: ['kb', 'stange'] };
const S = {
  profile, overrides: { '0-1': 'ex2' }, log: { '0-0-0': { sets: [true], kg: '12', reps: [10] } }, week: 2, day: 1,
  history: [{ date: '2026-11-02T17:00:00.000Z', name: 'Oberkörper', dur: 3000, sets: 12, reps: 100, vol: 900 }],
  cardio: [{ date: '2026-11-03T17:00:00.000Z', act: 'lauf', min: 30, km: 5, hr: null, rpe: 5 }],
  run: { p: { goal: '5k', level: '2', wd: [1, 3, 6], t5: 1620 }, week: 3, done: { '0-1': true } },
  active: { w: 2, di: 1 }, runActive: { i: 1, w: 0, t: 300 }, settings: { voice: false },
};
const now = new Date(2026, 10, 9, 10, 30);

// Export
{
  const txt = exportBackup(S, now), o = JSON.parse(txt);
  assert.equal(o.app, 'satzwerk'); assert.equal(o.v, 1);
  assert.equal(o.date, now.toISOString());
  assert.deepEqual(o.data, S);
  assert.equal(backupName(now), 'satzwerk-backup-2026-11-09.json');
  assert.equal(backupName(new Date(2027, 0, 3, 23, 59)), 'satzwerk-backup-2027-01-03.json');
}

// Rundreise: alles bleibt, nur halbe Einheiten fallen weg
{
  const back = parseBackup(exportBackup(S, now));
  assert.deepEqual(back, { ...S, active: null, runActive: null });
  // Roher Zustand wie in localStorage, auch mit BOM
  assert.deepEqual(parseBackup(JSON.stringify(S)), back);
  assert.deepEqual(parseBackup('﻿' + JSON.stringify(S)), back);
}

// Standardwerte für fehlende Felder
{
  const s = parseBackup(JSON.stringify({ profile }));
  assert.deepEqual(s, {
    profile, overrides: {}, log: {}, week: 0, day: null, history: [], active: null, cardio: [],
    run: { p: null, week: 0, done: {} }, runActive: null, settings: { voice: true },
  });
}

// Falsche Typen werden ersetzt, nicht abgelehnt
{
  const s = parseBackup(JSON.stringify({
    profile: { ...profile, tools: ['kb', 3], wd: 'Mo' }, overrides: [], log: 'x', week: 7, day: 'a',
    history: { a: 1 }, cardio: [1, null, { act: 'rad', min: 20 }], run: { p: 'x', week: 12, done: [] },
    settings: 'laut', extra: 'bleibt',
  }));
  assert.deepEqual(s.profile.tools, ['kb']);
  assert.equal('wd' in s.profile, false);
  assert.deepEqual([s.overrides, s.log, s.week, s.day, s.history], [{}, {}, 0, null, []]);
  assert.deepEqual(s.cardio, [{ act: 'rad', min: 20 }]);
  assert.deepEqual(s.run, { p: null, week: 0, done: {} });
  assert.deepEqual(s.settings, { voice: true });
  assert.equal(s.extra, 'bleibt');
  assert.equal(parseBackup(JSON.stringify({ profile, week: 1.5 })).week, 0);
  assert.equal(parseBackup(JSON.stringify({ profile, week: -1 })).week, 0);
  assert.equal(parseBackup(JSON.stringify({ profile, week: 3 })).week, 3);
  assert.deepEqual(parseBackup(JSON.stringify({ profile: { ...profile, wd: [0, 2] } })).profile.wd, ['0', '2']);
}

// Fehler mit verständlicher Meldung
{
  const err = (txt, re) => assert.throws(() => parseBackup(txt), e => e instanceof Error && re.test(e.message), String(txt).slice(0, 40));
  err('{"app":"satzwerk",', /beschädigt/);
  err('', /beschädigt/);
  err(undefined, /beschädigt/);
  err('<html></html>', /beschädigt/);
  err('null', /kein Satzwerk-Backup/);
  err('[1,2]', /kein Satzwerk-Backup/);
  err('"text"', /kein Satzwerk-Backup/);
  err('{"app":"andere","v":1,"data":{}}', /kein Satzwerk-Backup/);
  err('{"app":"satzwerk","v":1}', /kein Satzwerk-Backup/);
  err(JSON.stringify({ app: 'satzwerk', v: 1, data: { log: {} } }), /Trainingsprofil fehlt/);
  err(JSON.stringify({ log: {} }), /Trainingsprofil fehlt/);
  err(JSON.stringify({ profile: 'x' }), /Trainingsprofil fehlt/);
  err(JSON.stringify({ profile: { ...profile, tools: 'kb' } }), /unvollständig/);
  err(JSON.stringify({ profile: { ...profile, level: 1 } }), /unvollständig/);
  err(JSON.stringify({ profile: { goal: 'fitness' } }), /unvollständig/);
  err(JSON.stringify({ app: 'satzwerk', v: 2, data: S }), /neueren Version/);
}

// ---------- iCalendar ----------
const lines = ics => ics.split('\r\n');
const unfold = ics => ics.replace(/\r\n /g, '');
const field = (ics, k) => unfold(ics).split('\r\n').filter(l => l.startsWith(k + ':')).map(l => l.slice(k.length + 1));

assert.equal(icsName(), 'satzwerk-erinnerungen.ics');

{
  const days = [0, 1, 2, 3, 4, 5, 6].map(wd => ({ wd, name: 'Tag ' + wd }));
  // Freitag, 30.10.2026: Montag ist dann der 2.11. (Monatswechsel)
  const fri = new Date(2026, 9, 30, 20, 0);
  const ics = icsReminders({ days, now: fri });
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 7);
  assert.equal((ics.match(/END:VEVENT/g) || []).length, 7);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.deepEqual(field(ics, 'RRULE'), ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(d => 'FREQ=WEEKLY;BYDAY=' + d));
  // Heute (Freitag) zählt, auch wenn die Uhrzeit schon vorbei ist
  assert.deepEqual(field(ics, 'DTSTART'), ['20261102', '20261103', '20261104', '20261105', '20261030', '20261031', '20261101'].map(d => d + 'T180000'));
  // DTSTART-Wochentag passt zu BYDAY
  for (const [i, d] of field(ics, 'DTSTART').entries()) {
    const dt = new Date(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8));
    assert.equal((dt.getDay() + 6) % 7, i);
  }
  assert.deepEqual(field(ics, 'SUMMARY'), days.map(d => 'Satzwerk: ' + d.name));
  assert.deepEqual(field(ics, 'DURATION'), Array(7).fill('PT1H'));
  assert.deepEqual(field(ics, 'TRIGGER'), Array(7).fill('-PT30M'));
  assert.deepEqual(field(ics, 'ACTION'), Array(7).fill('DISPLAY'));
  assert.deepEqual(field(ics, 'DTSTAMP'), Array(7).fill(fri.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')));
  assert.match(field(ics, 'DTSTAMP')[0], /^\d{8}T\d{6}Z$/);
  // UID eindeutig und stabil
  const uids = field(ics, 'UID');
  assert.equal(new Set(uids).size, 7);
  assert.equal(uids[0], 'satzwerk-0-tag-0@satzwerk');
  assert.deepEqual(field(icsReminders({ days, now: new Date(2027, 2, 1) }), 'UID'), uids);
  // CRLF überall, kein einzelnes LF oder CR
  assert.equal(ics.replace(/\r\n/g, '').includes('\n'), false);
  assert.equal(ics.replace(/\r\n/g, '').includes('\r'), false);
  // Jede BEGIN hat ein END
  for (const b of ['VCALENDAR', 'VEVENT', 'VALARM']) assert.equal(ics.split('BEGIN:' + b).length, ics.split('END:' + b).length);
}

// Jahreswechsel und Uhrzeit
{
  // Mittwoch, 30.12.2026 -> Montag 4.1.2027
  const ics = icsReminders({ days: [{ wd: 0, name: 'A' }, { wd: 2, name: 'B' }], time: '7:05', lead: 0, now: new Date(2026, 11, 30, 9) });
  assert.deepEqual(field(ics, 'DTSTART'), ['20270104T070500', '20261230T070500']);
  assert.deepEqual(field(ics, 'TRIGGER'), ['PT0M', 'PT0M']);
  assert.deepEqual(field(icsReminders({ days: [{ wd: 6, name: 'A' }], time: '23:59', lead: 90, now }), 'TRIGGER'), ['-PT90M']);
  assert.deepEqual(field(icsReminders({ days: [{ wd: 6, name: 'A' }], time: '23:59', now }), 'DTSTART'), ['20261115T235900']);
}

// Ungültige Eingaben
for (const time of ['24:00', '18', '18:60', 'abc', '', '18:5'])
  assert.throws(() => icsReminders({ days: [{ wd: 0, name: 'A' }], time, now }), /HH:MM/, time);
assert.throws(() => icsReminders({ days: [], now }), /Keine Trainingstage/);
assert.throws(() => icsReminders({ days: [{ wd: 7, name: 'A' }], now }), /Wochentag/);
assert.throws(() => icsReminders({ days: [{ wd: 1.5, name: 'A' }], now }), /Wochentag/);
assert.throws(() => icsReminders({ days: [{ name: 'A' }], now }), /Wochentag/);
assert.throws(() => icsReminders({ days: [null], now }), /Wochentag/);
// Wochentag als Text wie in profile.wd
assert.deepEqual(field(icsReminders({ days: [{ wd: '2', name: 'A' }], now }), 'RRULE'), ['FREQ=WEEKLY;BYDAY=WE']);
assert.deepEqual(field(icsReminders({ days: [{ wd: 2 }], now }), 'SUMMARY'), ['Satzwerk: Training']);
assert.throws(() => icsReminders({ days: [{ wd: 0, name: 'A' }], lead: -5, now }), /Vorlaufzeit/);
assert.throws(() => icsReminders({ days: [{ wd: 0, name: 'A' }], lead: 'x', now }), /Vorlaufzeit/);

// Escaping
assert.equal(icsText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
{
  const ics = icsReminders({ days: [{ wd: 1, name: 'Beine, Po; Core' }, { wd: 1, name: 'Beine, Po; Core' }], now });
  assert.deepEqual(field(ics, 'SUMMARY'), Array(2).fill('Satzwerk: Beine\\, Po\\; Core'));
  // gleiche Namen am gleichen Tag bekommen trotzdem eigene UIDs
  assert.deepEqual(field(ics, 'UID'), ['satzwerk-1-beine-po-core@satzwerk', 'satzwerk-1-beine-po-core-2@satzwerk']);
}

// Faltung nach UTF-8-Bytes; Umlaute werden nicht zerteilt
{
  const bytes = s => Buffer.byteLength(s, 'utf8');
  const long = 'Ganzkörper Übungen für Rücken, Schultern und Gesäß – äöüß '.repeat(4);
  const ics = icsReminders({ days: [{ wd: 3, name: long }], now });
  for (const l of lines(ics)) assert.ok(bytes(l) <= 75, `${bytes(l)} Bytes: ${l}`);
  assert.ok(lines(ics).some(l => l.startsWith(' ')), 'lange Zeile wurde gefaltet');
  assert.ok(!ics.includes('�'));
  assert.equal(field(ics, 'SUMMARY')[0], icsText('Satzwerk: ' + long));
  // Genau an der Grenze: 75 Bytes bleiben eine Zeile, 76 werden gefaltet
  assert.equal(icsFold('x'.repeat(75)), 'x'.repeat(75));
  assert.equal(icsFold('x'.repeat(76)), 'x'.repeat(75) + '\r\n x');
  // „ö“ (2 Bytes) passt nicht mehr in Byte 75 und wandert ganz in die nächste Zeile
  assert.equal(icsFold('x'.repeat(74) + 'öy'), 'x'.repeat(74) + '\r\n öy');
  // Fortsetzungszeilen haben höchstens 74 Bytes Inhalt
  const f = icsFold('ä'.repeat(100)).split('\r\n');
  assert.deepEqual(f.map(bytes), [74, 75, 53]); // 37 + 37 + 26 × „ä“
  assert.equal(f.map((l, i) => i ? l.slice(1) : l).join(''), 'ä'.repeat(100));
  // Emoji (4 Bytes, Surrogatpaar) bleibt ganz
  assert.ok(icsFold('x'.repeat(73) + '💪').split('\r\n')[1] === ' 💪');
}

console.log('OK: Backup und Kalender-Erinnerungen geprüft');
