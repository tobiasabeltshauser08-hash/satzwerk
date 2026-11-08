// Plan-Generator: ohne DOM, damit er sich mit Node testen lässt
import { EX, FINISHERS, CARDIO, TEMPLATES, SPLITS, SCHEDULE, SCHEME, SECONDS, WITH_FINISHER, WEEKS } from "./data.js";

const MAIN_PATTERNS = ["squat", "hinge", "hpush", "vpush", "hpull", "vpull"];
const FILL = ["core", "shoulder", "triceps", "biceps", "core", "calves"];

const available = (t, p) => t.every(x => p.tools.includes(x));

export function propOf(ex) {
  if ("prop" in ex) return ex.prop;
  return ex.t.includes("kb") ? "kb" : ex.t.includes("kh") ? "db" : ex.t.includes("lh") ? "bb" : null;
}

export function candidates(pattern, p) {
  const all = EX.filter(e => e.p === pattern && available(e.t, p));
  const fit = all.filter(e => e.lvl <= +p.level);
  // Übungen mit Geräten zuerst, dann die schwierigere Variante
  return (fit.length ? fit : all).sort((a, b) => (b.t.length > 0) - (a.t.length > 0) || b.lvl - a.lvl);
}

function slotCount(goal, time) {
  let n = { 30: 4, 45: 5, 60: 6, 75: 7 }[time];
  if (goal === "kraft" || (WITH_FINISHER.includes(goal) && +time <= 45)) n -= 1;
  return Math.max(3, n);
}

// Gewählte Wochentage (0 = Montag); ältere Profile hatten nur die Anzahl der Tage
export const trainingDays = p => p.wd ? p.wd.map(Number).sort((a, b) => a - b) : SCHEDULE[+p.days];

export function buildPlan(p, overrides = {}) {
  const schedule = trainingDays(p), days = schedule.length;
  const [splitName, keys] = SPLITS[p.focus][days];
  const dayKeys = keys.split("");
  if (p.goal === "ausdauer" && days >= 3) {
    dayKeys[dayKeys.length - 1] = "hiit";
    if (days >= 5) dayKeys[dayKeys.length - 3] = "z2";
  } else if (p.goal === "abnehmen" && days >= 4) {
    dayKeys[dayKeys.length - 1] = "z2";
  }
  const fins = FINISHERS.filter(f => available(f.t, p));
  const seen = {};
  const out = dayKeys.map((key, di) => {
    const wd = schedule[di];
    if (CARDIO[key]) return { kind: "cardio", key, name: CARDIO[key].n, wd, rows: [] };
    const tpl = TEMPLATES[key];
    const variant = seen[key] = (seen[key] ?? -1) + 1;
    const used = new Set(), patCount = {}, rows = [], n = slotCount(p.goal, p.time);
    // Vorlage der Reihe nach füllen; fehlt eine Alternative, mit weiteren Mustern auffüllen
    [...tpl.s, ...FILL].forEach((pat, slot) => {
      if (rows.length >= n) return;
      const c = candidates(pat, p);
      const rep = patCount[pat] = (patCount[pat] ?? -1) + 1;
      let idx = variant + rep + (overrides[`${di}-${slot}`] || 0);
      let ex = c[idx % c.length];
      for (let k = 0; k < c.length && used.has(ex.id); k++) ex = c[++idx % c.length];
      if (used.has(ex.id)) return;
      used.add(ex.id);
      rows.push({ ex, slot, main: slot < 2 && MAIN_PATTERNS.includes(pat), alt: c.length > 1 });
    });
    const day = { kind: "lift", key, rows, wd, fin: WITH_FINISHER.includes(p.goal) && fins.length ? fins[di % fins.length].x : null };
    // An die gewählte Zeit anpassen: gemessen an der härtesten Woche (Steigerung)
    while (minutes(p, day, 2) > +p.time + 5) {
      if (day.fin && +p.time <= 30) day.fin = null;
      else if (day.rows.length > 3 || (day.rows.length > 2 && +p.time <= 30)) day.rows.pop();
      else break;
    }
    const multi = dayKeys.filter(k => k === key).length > 1;
    return { ...day, name: tpl.n + (multi ? " " + "ABC"[variant] : "") };
  });
  return { split: splitName, days: out };
}

export const cardioItems = (day, w, p) => CARDIO[day.key].items(w, +p.time);

export function prescription(p, row, w) {
  const sc = SCHEME[p.goal][row.main ? "main" : "acc"];
  const wk = WEEKS[w];
  let sets = sc[0] - (p.level === "1" && sc[0] > 3 ? 1 : 0) + (row.main || wk.set < 0 ? wk.set : 0);
  if (+p.time <= 30) sets = Math.min(sets, 4);
  sets = Math.max(2, sets);
  const rir = Math.max(0, sc[3] + wk.rir);
  const timed = row.ex.u === "s";
  const reps = timed ? `${SECONDS[p.goal]} s` : sc[1];
  const nums = reps.match(/\d+/g).map(Number);
  const rest = +p.time <= 45 ? Math.min(sc[2], 120) : sc[2]; // bei wenig Zeit kürzere Pausen
  return { sets, reps, rest, rir, timed, lo: nums[0], hi: nums[nums.length - 1] };
}

export function minutes(p, day, w) {
  if (day.kind === "cardio") return day.key === "z2" ? CARDIO.z2.run(w, +p.time) + 5 : 15 + CARDIO.hiit.reps(w, +p.time) * 4;
  let s = 6 * 60; // Aufwärmen
  // Arbeitszeit je Satz: ca. 3 s pro Wiederholung plus Vorbereiten
  day.rows.forEach(r => { const x = prescription(p, r, w); s += x.sets * ((x.timed ? x.hi : x.hi * 3) + 15 + x.rest); });
  if (day.fin) s += 9 * 60;
  return Math.round(s / 60 / 5) * 5;
}
