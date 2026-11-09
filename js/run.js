// Laufplan, Intervall-Ablauf und GPS-Strecke: ohne DOM, damit es sich mit Node testen lässt

export const RUN_GOALS = [
  ["start", "Anfangen", "Von Gehen und Laufen bis 30 min am Stück"],
  ["fit", "Fit bleiben", "Grundlagenausdauer, locker und regelmäßig"],
  ["5k", "5 km schneller", "Intervalle und Tempo für die 5 km"],
  ["10k", "10 km", "Längere Intervalle, Longrun bis 90 min"],
  ["hm", "Halbmarathon", "Longrun bis 2 Stunden, Tempoläufe"],
];
export const RUN_LEVELS = [
  ["1", "Wenig Lauferfahrung", "Läufst selten oder kürzer als 30 min"],
  ["2", "Regelmäßig", "30–45 min am Stück sind kein Problem"],
  ["3", "Erfahren", "Läufst seit Jahren mehrmals pro Woche"],
];
export const RUN_WEEKS = 8;
// Belastung je Woche: 3 Wochen steigern, 1 Woche entlasten, dann noch einmal, zum Schluss locker vor dem Ziel
export const RUN_LOAD = [0.8, 0.9, 1, 0.7, 0.95, 1.05, 1.15, 0.75];
export const RUN_PHASE = ["Einstieg", "Aufbau", "Steigerung", "Entlastung", "Aufbau", "Steigerung", "Höhepunkt", "Lockern"];
// Beim Anfangen ist Woche 8 keine Entlastung, sondern das Ziel: 30 min am Stück
export const runPhase = (goal, w) => goal === "start" && w === RUN_WEEKS - 1 ? "Ziel: 30 min" : RUN_PHASE[w];

export const SESSIONS = {
  easy: { n: "Lockerer Lauf", h: "Gesprächstempo: Du kannst in ganzen Sätzen reden." },
  int: { n: "Intervalle", h: "Schnelle Abschnitte zügig, aber gleichmäßig; die letzte Wiederholung so schnell wie die erste." },
  tempo: { n: "Tempolauf", h: "Zügig an der Schwelle: Reden geht nur noch in kurzen Worten." },
  long: { n: "Longrun", h: "Ruhig und gleichmäßig. Lieber langsamer als zu schnell, die Dauer zählt." },
  walk: { n: "Laufen & Gehen", h: "Laufabschnitte locker; die Gehpausen gehören zum Plan." },
};
// Abschnitts-Arten: work = schnell, rest = Trabpause, walk = Gehen
export const SEG = { warm: "Einlaufen", run: "Laufen", work: "Schnell", rest: "Traben", walk: "Gehen", tempo: "Tempo", cool: "Auslaufen" };

const MIN = 60;
const r5 = m => Math.max(5, Math.round(m / 5) * 5);

// Anfänger: [Laufen min, Gehen min, Wiederholungen] je Woche, am Ende 30 min am Stück
const WALK_RUN = [[1, 2, 8], [2, 2, 6], [3, 2, 5], [2, 1, 7], [5, 2, 4], [8, 2, 3], [12, 2, 2], [30, 0, 1]];
// Intervalle [Wdh., schnell s, Trab s]; kurz für fit/5k, lang für 10k/Halbmarathon
const INT_SHORT = [[6, 60, 60], [5, 120, 90], [5, 180, 120], [4, 120, 120], [4, 240, 120], [5, 240, 120], [6, 180, 90], [3, 180, 180]];
const INT_LONG = [[5, 180, 90], [4, 300, 120], [5, 300, 120], [4, 180, 120], [4, 360, 150], [5, 360, 150], [4, 480, 180], [3, 300, 180]];
// Tempolauf [Blöcke, min, Trab min]
const TEMPO = [[1, 10, 0], [1, 15, 0], [2, 10, 3], [1, 10, 0], [2, 12, 3], [1, 25, 0], [3, 10, 2], [1, 15, 0]];
// Longrun-Grundwert in Minuten (Niveau 1); +10 min je Niveau
const LONG = { start: 0, fit: 45, "5k": 50, "10k": 65, hm: 80 };

// Welche Einheiten in einer Woche mit n Lauftagen
export function sessionKeys(goal, n) {
  if (goal === "start") return Array(n).fill("walk");
  const k = { 2: ["int", "long"], 3: ["easy", "int", "long"], 4: ["easy", "int", "tempo", "long"], 5: ["easy", "int", "easy", "tempo", "long"] }[n];
  // Fit bleiben: Tempo statt Intervalle ist genug, kein zweiter harter Tag
  return goal === "fit" ? k.map((x, i) => x === "int" ? "tempo" : x === "tempo" ? "easy" : x) : k;
}

export const longMin = (p, w) => r5((LONG[p.goal] + (+p.level - 1) * 10) * RUN_LOAD[w]);

// Abschnitte einer Einheit: [{ k, sec }]
export function segments(p, key, w) {
  const lv = +p.level;
  if (key === "walk") {
    const [r, g, n] = WALK_RUN[w], out = [{ k: "warm", sec: 5 * MIN }];
    for (let i = 0; i < n; i++) { out.push({ k: "run", sec: r * MIN }); if (g && i < n - 1) out.push({ k: "walk", sec: g * MIN }); }
    return [...out, { k: "cool", sec: 5 * MIN }];
  }
  if (key === "easy") return [{ k: "run", sec: r5(longMin(p, w) * 0.6) * MIN }];
  if (key === "long") return [{ k: "run", sec: longMin(p, w) * MIN }];
  const out = [{ k: "warm", sec: (lv === 1 ? 10 : 15) * MIN }];
  if (key === "int") {
    const [n0, work, rest] = (p.goal === "10k" || p.goal === "hm" ? INT_LONG : INT_SHORT)[w];
    const n = Math.max(2, n0 + lv - 2);
    for (let i = 0; i < n; i++) { out.push({ k: "work", sec: work }); if (i < n - 1) out.push({ k: "rest", sec: rest }); }
  } else {
    const [n, m, rest] = TEMPO[w], len = Math.max(6, m + (lv - 2) * 3);
    for (let i = 0; i < n; i++) { out.push({ k: "tempo", sec: len * MIN }); if (i < n - 1) out.push({ k: "rest", sec: rest * MIN }); }
  }
  return [...out, { k: "cool", sec: 10 * MIN }];
}

export const totalSec = segs => segs.reduce((a, s) => a + s.sec, 0);

// Kurzbeschreibung, z. B. „15 min Einlaufen · 5 × 3 min schnell / 2 min Trab · 10 min Auslaufen“
const dur = s => s % 60 ? (s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min`) : `${s / 60} min`;
export function describe(segs) {
  const parts = [];
  for (let i = 0; i < segs.length;) {
    const s = segs[i];
    let n = 1, rest = null, j = i + 1;
    // Serie: Block, Pause, Block, … mit gleich langen Blöcken
    while ((segs[j]?.k === "rest" || segs[j]?.k === "walk") && segs[j + 1]?.k === s.k && segs[j + 1].sec === s.sec) { rest = segs[j]; n++; j += 2; }
    const what = s.k === "work" ? "schnell" : s.k === "tempo" ? "Tempo" : s.k === "run" ? (n > 1 ? "laufen" : "locker") : SEG[s.k];
    parts.push(`${n > 1 ? n + " × " : ""}${dur(s.sec)} ${what}${rest ? ` / ${dur(rest.sec)} ${rest.k === "walk" ? "gehen" : "Trab"}` : ""}`);
    i = j;
  }
  return parts.join(" · ");
}

// Wochenplan: Einheiten auf die gewählten Wochentage verteilen, Longrun auf den letzten Tag
export function buildRunWeek(p, w) {
  const days = p.wd.map(Number).sort((a, b) => a - b);
  return sessionKeys(p.goal, days.length).map((key, i) => {
    const segs = segments(p, key, w);
    return { key, wd: days[i], name: SESSIONS[key].n, segs, min: Math.round(totalSec(segs) / 60), text: describe(segs) };
  });
}

// Zieltempo aus einer aktuellen 5-km-Zeit (Sekunden), Angaben in s/km.
// Schnelle Abschnitte: 5-km-Tempo; bei 10 km und Halbmarathon (längere Intervalle) 10-km-Tempo
const PACE = { run: 1.25, warm: 1.35, cool: 1.35, rest: 1.45, walk: 0, tempo: 1.07, work: 0.98 };
export function targetPace(t5, k, goal) {
  if (!t5 || !PACE[k]) return null;
  return Math.round(t5 / 5 * (k === "work" && (goal === "10k" || goal === "hm") ? 1.03 : PACE[k]));
}
export const fmtPace = s => { if (!s || !Number.isFinite(s)) return "–"; s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
// „25:30“, „25“ oder „1:02:00“ in Sekunden; unsinnige Zeiten (unter 12 oder über 60 min) ergeben null
export function parseTime(v) {
  const p = String(v ?? "").trim().split(":").map(x => x === "" ? NaN : +x);
  if (!p.length || p.some(x => !Number.isFinite(x) || x < 0) || (p.length > 1 && p.slice(1).some(x => x >= 60))) return null;
  const s = p.length === 1 ? p[0] * 60 : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
  return s >= 12 * 60 && s <= 60 * 60 ? Math.round(s) : null;
}

// Wo steht die Einheit nach t Sekunden Laufzeit?
export function segAt(segs, t) {
  let a = 0;
  for (let i = 0; i < segs.length; i++) {
    if (t < a + segs[i].sec) return { i, left: a + segs[i].sec - t, into: t - a };
    a += segs[i].sec;
  }
  return { i: segs.length, left: 0, into: 0, over: t - a };
}

// ---------- GPS-Strecke ----------
const R = 6371000;
export function haversine(a, b) {
  const rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Neue Position verrechnen. Ungenaue Punkte (> 30 m) und Sprünge (schneller als 12 m/s) werden verworfen,
// kleine Bewegungen gesammelt, bis sie über dem Messrauschen liegen.
export const MAX_ACC = 30, MAX_SPEED = 12;
export function trackAdd(tr, fix) {
  if (!fix || fix.acc > MAX_ACC) return { ...tr, bad: (tr.bad || 0) + 1 };
  const out = { ...tr, bad: 0 };
  if (!tr.last) return { ...out, m: tr.m || 0, last: fix };
  const d = haversine(tr.last, fix), dt = (fix.t - tr.last.t) / 1000;
  if (dt <= 0) return out;
  if (d / dt > MAX_SPEED) return out;
  if (d < Math.max(5, Math.min(fix.acc, tr.last.acc) * 0.5)) return out;
  return { ...out, m: (tr.m || 0) + d, last: fix };
}
// Nach einer Pause neu ansetzen, damit die Strecke dazwischen nicht zählt
export const trackResume = tr => ({ ...tr, last: null });

// Gelaufene Kilometer: gesamt, diese Woche (ab Montag), dieses Jahr, längster Lauf
export function kmStats(entries, now = new Date()) {
  const wk = new Date(now); wk.setHours(0, 0, 0, 0); wk.setDate(wk.getDate() - (wk.getDay() + 6) % 7);
  const yr = new Date(now.getFullYear(), 0, 1);
  const out = { total: 0, week: 0, year: 0, runs: 0, longest: 0 };
  for (const e of entries) {
    if (e.act !== "lauf" || !e.km) continue;
    const d = new Date(e.date);
    out.total += e.km; out.runs++; out.longest = Math.max(out.longest, e.km);
    if (d >= wk) out.week += e.km;
    if (d >= yr) out.year += e.km;
  }
  for (const k of ["total", "week", "year"]) out[k] = Math.round(out[k] * 100) / 100;
  return out;
}
