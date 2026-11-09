// Puls-Zonen, Körperwerte und Ernährung: ohne DOM, damit es sich mit Node testen lässt

const num = (v, lo, hi) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const r1 = v => Math.round(v * 10) / 10;
const DAY = 864e5;

// ---------- Puls ----------
// Tanaka: genauer als 220 − Alter, vor allem bei Älteren
export const hrMax = age => Math.round(208 - 0.7 * age);

// Karvonen: Prozent der Herzfrequenzreserve (max − Ruhepuls) plus Ruhepuls
export const ZONES = [
  [1, "Regeneration", 0.5, 0.6, "Sehr locker, Erholung und Einlaufen"],
  [2, "Grundlage", 0.6, 0.7, "Gesprächstempo, baut Ausdauer auf"],
  [3, "Aerob", 0.7, 0.8, "Zügig, Reden nur in kurzen Sätzen"],
  [4, "Schwelle", 0.8, 0.9, "Hart, Tempoläufe und lange Intervalle"],
  [5, "Maximal", 0.9, 1, "Sehr hart, nur kurze Intervalle"],
];
export function hrZones({ age, rest, max } = {}) {
  const a = age == null || age === "" ? null : num(age, 10, 100);
  const m = max == null || max === "" ? (a == null ? null : hrMax(a)) : num(max, 120, 230);
  // Ohne Ruhepuls 60 annehmen und als Schätzung markieren
  const est = rest == null || rest === "";
  const r = est ? 60 : num(rest, 30, 110);
  if ((age != null && age !== "" && a == null) || m == null || r == null || m - r < 40) return null;
  const hrr = m - r, bpm = p => Math.round(r + hrr * p);
  // Ohne Überlappung: jede Zone beginnt einen Schlag über dem Ende der vorigen
  const zones = ZONES.map(([z, n, lo, hi, txt], i) => ({ z, n, lo: i ? bpm(lo) + 1 : bpm(lo), hi: bpm(hi), txt }));
  return { max: Math.round(m), rest: Math.round(r), est, zones };
}

// Zielzonen [lo, hi] je Lauf-Abschnitt (Keys wie SEG in run.js)
const SEG_ZONE = {
  warm: [1, 2], // Einlaufen: locker beginnen, zum Ende in die Grundlage
  run: [2, 2], // lockere Laufabschnitte im Gesprächstempo
  work: [4, 5], // schnelle Intervalle: 5-km-Tempo, Puls steigt bis in Zone 5
  rest: [1, 2], // Trabpause: Puls soll sinken
  walk: [1, 1], // Gehpause: reine Erholung
  tempo: [3, 4], // Tempolauf an der Schwelle, beginnt oft noch in Zone 3
  cool: [1, 2], // Auslaufen: wie Einlaufen
};
export const segZone = k => SEG_ZONE[k] || null;

// Zielzonen [lo, hi] je Einheit (Keys wie SESSIONS in run.js)
const SESS_ZONE = {
  easy: [2, 2], // lockerer Lauf: Grundlage
  long: [2, 2], // Longrun: ruhig, die Dauer zählt, nicht das Tempo
  int: [4, 5], // Intervalle: harte Abschnitte, dazwischen Erholung
  tempo: [3, 4], // Tempolauf: an der Schwelle
  walk: [1, 2], // Laufen & Gehen: Einsteiger bleiben locker
};
export const sessZone = key => SESS_ZONE[key] || null;

// ---------- Körperwerte ----------
export const BODY = ["kg", "waist", "fat", "chest", "arm", "hip"];
const BODY_RANGE = { kg: [30, 300], waist: [30, 250], fat: [3, 60], chest: [30, 250], arm: [30, 250], hip: [30, 250] };

// Eingaben prüfen; fehlende Werte werden null, ohne einen einzigen gültigen Wert gibt es keinen Eintrag
export function normBody(e) {
  if (!e) return null;
  const out = { date: e.date || new Date().toISOString() };
  let any = false;
  for (const k of BODY) {
    const v = num(e[k], ...BODY_RANGE[k]);
    out[k] = v == null ? null : r1(v);
    if (v != null) any = true;
  }
  return any ? out : null;
}

// Verlauf eines Feldes: letzter/erster Wert, Änderung gegenüber dem letzten Wert vor 4 Wochen, Schnitt der letzten 7 Tage
export function bodyStats(entries, key, now = new Date()) {
  const series = (entries || [])
    .filter(e => e && Number.isFinite(e[key]))
    .map(e => ({ date: e.date, v: e[key] }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!series.length) return { last: null, first: null, change4w: null, avg7: null, series };
  const t = +now, last = series[series.length - 1].v;
  // Bezugswert: letzter älterer Eintrag (nicht der aktuelle), der mindestens 28 Tage alt ist; gibt es keinen, fehlt die Änderung
  const ref = series.slice(0, -1).filter(s => new Date(s.date) <= t - 28 * DAY).pop();
  const wk = series.filter(s => { const d = +new Date(s.date); return d > t - 7 * DAY && d <= t; });
  return {
    last, first: series[0].v,
    change4w: ref ? r1(last - ref.v) : null,
    avg7: wk.length ? r1(wk.reduce((a, s) => a + s.v, 0) / wk.length) : null,
    series,
  };
}

// ---------- Ernährung ----------
// Aktivitätsfaktor aus Trainingsstunden pro Woche: ≈ 1,3 bis 1 Std, linear bis 1,7 ab 7 Std
export const activity = hours => Math.round((1.3 + 0.4 * Math.max(0, Math.min(1, (hours - 1) / 6))) * 100) / 100;
// Eiweiß in g je kg Körpergewicht
const PROTEIN = { muskel: [1.6, 2.2], kraft: [1.6, 2.2], abnehmen: [1.8, 2.2] };

// days = Anzahl Trainingstage oder die Tage selbst (wd-Array), time = Minuten pro Einheit
export function nutrition({ sex, age, cm, kg, goal, days, time } = {}) {
  const a = num(age, 14, 100), h = num(cm, 120, 230), m = num(kg, 30, 300);
  const d = num(Array.isArray(days) ? days.length : days, 0, 7), min = num(time, 0, 300);
  if ((sex !== "m" && sex !== "w") || a == null || h == null || m == null || d == null || min == null) return null;
  // Mifflin-St Jeor
  const bmr = Math.round(10 * m + 6.25 * h - 5 * a + (sex === "m" ? 5 : -161));
  const tdee = Math.round(bmr * activity(d * min / 60));
  const r50 = v => Math.round(v / 50) * 50;
  let kcal;
  // Abnehmen: 15 % Defizit, aber nie unter den Grundumsatz (dann auf 50 aufrunden)
  if (goal === "abnehmen") kcal = Math.max(r50(tdee * 0.85), Math.ceil(bmr / 50) * 50);
  else kcal = r50(tdee + (goal === "muskel" ? 250 : goal === "kraft" ? 150 : 0));
  const [plo, phi] = PROTEIN[goal] || [1.4, 1.8];
  return {
    bmr, tdee, kcal,
    protein: [Math.round(plo * m), Math.round(phi * m)],
    water: r1(m * 0.035),
    note: "Richtwerte aus Formeln – keine medizinische Beratung; bei Erkrankungen, Schwangerschaft oder Essstörungen ärztlich abklären.",
  };
}
