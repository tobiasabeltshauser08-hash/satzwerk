// Ausdauer-Tracking: ohne DOM, damit es sich mit Node testen lässt

export const ACTIVITIES = [
  ["lauf", "Laufen"], ["gehen", "Zügig gehen"], ["rad", "Radfahren"], ["rudern", "Rudern"],
  ["schwimmen", "Schwimmen"], ["seil", "Seilspringen"], ["zirkel", "Zirkel / Finisher"], ["sonst", "Sonstiges"],
];
export const actLabel = k => (ACTIVITIES.find(a => a[0] === k) || [, "Ausdauer"])[1];

// WHO: 150 min moderat oder 75 min intensiv pro Woche; intensive Minuten zählen doppelt
export const WEEK_GOAL = 150;
export const INTENSE_RPE = 7;
export const RPE = ["", "sehr leicht", "leicht", "leicht", "locker", "mittel", "mittel", "anstrengend", "hart", "sehr hart", "maximal"];

const num = (v, lo, hi) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };

// Eingaben prüfen; ohne gültige Dauer gibt es keinen Eintrag
export function normalize(e) {
  const min = num(e.min, 1, 600);
  if (min == null) return null;
  const km = num(e.km, 0.1, 500), hr = num(e.hr, 40, 230), rpe = num(e.rpe, 1, 10);
  return {
    date: e.date || new Date().toISOString(),
    act: ACTIVITIES.some(a => a[0] === e.act) ? e.act : "sonst",
    min: Math.round(min), km: km == null ? null : Math.round(km * 100) / 100,
    hr: hr == null ? null : Math.round(hr), rpe: rpe == null ? null : Math.round(rpe),
    src: e.src || "frei", name: e.name || "",
  };
}

export const points = e => e.min * (e.rpe != null && e.rpe >= INTENSE_RPE ? 2 : 1);

// Tempo: Laufen und Gehen in min/km, sonst km/h
export function pace(e) {
  if (!e.km) return "";
  if (e.act === "lauf" || e.act === "gehen") {
    const s = Math.round(e.min * 60 / e.km);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} /km`;
  }
  return `${(e.km / (e.min / 60)).toFixed(1).replace(".", ",")} km/h`;
}

// Montag 0:00 der Woche (Ortszeit)
export function weekStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - (x.getDay() + 6) % 7);
  return x;
}

export function summary(entries, now = new Date(), nWeeks = 8) {
  const cur = weekStart(now);
  const weeks = Array.from({ length: nWeeks }, (_, i) => {
    const start = new Date(cur); start.setDate(start.getDate() - (nWeeks - 1 - i) * 7);
    return { start, n: 0, min: 0, km: 0, pts: 0 };
  });
  const total = { n: 0, min: 0, km: 0 };
  let hrSum = 0, hrN = 0;
  const since4 = new Date(cur); since4.setDate(since4.getDate() - 21);
  for (const e of entries) {
    const d = new Date(e.date);
    total.n++; total.min += e.min; total.km += e.km || 0;
    const wk = weeks.find((w, i) => d >= w.start && (i === weeks.length - 1 || d < weeks[i + 1].start));
    if (wk) { wk.n++; wk.min += e.min; wk.km += e.km || 0; wk.pts += points(e); }
    if (e.hr && d >= since4) { hrSum += e.hr; hrN++; }
  }
  // Schnellstes Lauftempo der letzten 4 Wochen (ab 1 km)
  const runs = entries.filter(e => e.act === "lauf" && e.km >= 1 && new Date(e.date) >= since4);
  const best = runs.sort((a, b) => a.min / a.km - b.min / b.km)[0] || null;
  const now0 = weeks[weeks.length - 1];
  return { weeks, total, week: now0, goal: Math.min(100, Math.round(now0.pts / WEEK_GOAL * 100)), hr: hrN ? Math.round(hrSum / hrN) : null, best };
}
