// Datensicherung (Export/Import) und Kalender-Erinnerungen: ohne DOM, damit es sich mit Node testen lässt

const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---------- Backup ----------
// 2: Log je Block mit Übung („block-woche-tag-reihe“); Backups mit 1 stellt die App beim Laden um
export const BACKUP_V = 2;
export const exportBackup = (S, now = new Date()) => JSON.stringify({ app: "satzwerk", v: BACKUP_V, date: now.toISOString(), data: S });
export const backupName = (now = new Date()) => `satzwerk-backup-${ymd(now)}.json`;

// Backup-Datei (oder roher Zustand aus localStorage) prüfen; liefert den Zustand oder wirft einen Fehler mit Meldung für den Nutzer
export function parseBackup(text) {
  let o;
  try { o = JSON.parse(String(text ?? "").replace(/^\uFEFF/, "")); } catch (e) { throw new Error("Die Datei ist beschädigt oder keine JSON-Datei."); }
  if (!isObj(o)) throw new Error("Die Datei ist kein Satzwerk-Backup.");
  let S = o;
  if ("app" in o || "data" in o) {
    if (o.app !== "satzwerk" || !isObj(o.data)) throw new Error("Die Datei ist kein Satzwerk-Backup.");
    if (typeof o.v === "number" && o.v > BACKUP_V) throw new Error("Das Backup stammt aus einer neueren Version von Satzwerk. Bitte zuerst die App aktualisieren.");
    S = o.data;
  }
  const p = S.profile;
  if (!isObj(p)) throw new Error("Die Datei ist kein Satzwerk-Backup: Das Trainingsprofil fehlt.");
  if (!["goal", "focus", "level", "time"].every(k => typeof p[k] === "string") || !Array.isArray(p.tools))
    throw new Error("Die Datei ist beschädigt: Das Trainingsprofil ist unvollständig.");
  const profile = { ...p, tools: p.tools.filter(t => typeof t === "string") };
  // Trainingstage sind optional; Unbrauchbares weglassen, die App rechnet sie dann neu aus
  if ("wd" in p && !(Array.isArray(p.wd) && p.wd.every(x => /^[0-6]$/.test(String(x))))) delete profile.wd;
  else if (Array.isArray(p.wd)) profile.wd = p.wd.map(String);

  const run = isObj(S.run) ? S.run : {};
  return {
    ...S,
    profile,
    overrides: isObj(S.overrides) ? S.overrides : {},
    log: isObj(S.log) ? S.log : {},
    week: isInt(S.week, 0, 3) ? S.week : 0,
    day: S.day === null || isInt(S.day, 0, 6) ? S.day ?? null : null,
    history: Array.isArray(S.history) ? S.history.filter(isObj) : [],
    cardio: Array.isArray(S.cardio) ? S.cardio.filter(isObj) : [],
    run: { p: isObj(run.p) ? run.p : null, week: isInt(run.week, 0, 7) ? run.week : 0, done: isObj(run.done) ? run.done : {} },
    settings: isObj(S.settings) ? S.settings : { voice: true },
    // Keine halb fertigen Einheiten importieren
    active: null,
    runActive: null,
  };
}

// ---------- Kalender-Erinnerungen (iCalendar, RFC 5545) ----------
const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
export const icsName = () => "satzwerk-erinnerungen.ics";
export const icsText = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const slug = s => String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "training";
const utf8Len = c => { const n = c.codePointAt(0); return n < 0x80 ? 1 : n < 0x800 ? 2 : n < 0x10000 ? 3 : 4; };
// Zeilen über 75 Oktette falten; Fortsetzungszeilen beginnen mit einem Leerzeichen, Umlaute werden nie zerteilt
export function icsFold(line) {
  const out = [];
  let cur = "", len = 0;
  for (const c of line) {
    const l = utf8Len(c);
    if (len + l > 75) { out.push(cur); cur = " "; len = 1; }
    cur += c; len += l;
  }
  out.push(cur);
  return out.join("\r\n");
}
const stamp = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

export function icsReminders({ days, time = "18:00", lead = 30, now = new Date() }) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(time).trim());
  if (!m) throw new Error("Bitte die Uhrzeit als HH:MM angeben, z. B. 18:00.");
  if (!Array.isArray(days) || !days.length) throw new Error("Keine Trainingstage für Erinnerungen ausgewählt.");
  // Wochentag als Zahl oder Text („0“ wie in profile.wd)
  if (days.some(d => !/^[0-6]$/.test(String(d?.wd)))) throw new Error("Ungültiger Wochentag.");
  const lm = Math.round(+lead);
  if (!Number.isFinite(lm) || lm < 0) throw new Error("Die Vorlaufzeit muss 0 oder mehr Minuten sein.");
  const hhmm = pad(+m[1]) + m[2] + "00";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const uids = new Set();
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Satzwerk//Trainingserinnerungen//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Satzwerk Training"];
  for (const day of days) {
    const wd = +day.wd, name = String(day.name ?? "Training");
    // Nächster passender Tag ab heute; 0 = Montag
    const start = new Date(today);
    start.setDate(today.getDate() + (wd - (today.getDay() + 6) % 7 + 7) % 7);
    let uid = `satzwerk-${wd}-${slug(name)}`;
    for (let i = 2; uids.has(uid); i++) uid = `satzwerk-${wd}-${slug(name)}-${i}`;
    uids.add(uid);
    lines.push("BEGIN:VEVENT", `UID:${uid}@satzwerk`, `DTSTAMP:${stamp(now)}`,
      `DTSTART:${ymd(start).replace(/-/g, "")}T${hhmm}`, "DURATION:PT1H", `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[wd]}`,
      `SUMMARY:${icsText("Satzwerk: " + name)}`, `DESCRIPTION:${icsText(`Training laut Plan: ${name}. Öffne Satzwerk, um zu starten.`)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText("Satzwerk: " + name)}`, `TRIGGER:${lm ? `-PT${lm}M` : "PT0M"}`, "END:VALARM",
      "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
