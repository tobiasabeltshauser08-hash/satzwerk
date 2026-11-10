// Trainings-Log über mehrere 4-Wochen-Blöcke, Wochenwechsel und Kraft-Fortschritt: ohne DOM, damit es sich mit Node testen lässt.
//
// Log-Format 2: Schlüssel „block-woche-tag-reihe“ (z. B. „1-0-2-3“), Einträge { sets, kg, reps, id, date }.
// id = Übung, damit „Zuletzt“, Gewichtsvorschlag und Fortschritt nach einem Übungstausch nicht die alte Übung zeigen.
// Format 1 (bis Satzwerk v8) hatte nur „woche-tag-reihe“ ohne id.

export const LOG_V = 2;
export const key = (b, w, d, r) => `${b}-${w}-${d}-${r}`;

/**
 * Altes Log (Format 1) auf Format 2 umstellen. idOf(d, r) liefert die Übung, die heute an dieser Stelle steht
 * (bestmögliche Annahme, denn Format 1 hat sich nicht gemerkt, welche Übung es war). Ändert S und gibt es zurück.
 */
export function migrateLog(S, idOf) {
  if (S.logV === LOG_V) return S;
  const log = {};
  for (const [k, v] of Object.entries(S.log || {})) {
    const p = k.split("-");
    if (p.length === 4) { log[k] = v; continue; }           // schon neu
    if (p.length !== 3) continue;
    const [w, d, r] = p;
    const e = { ...v };
    if (/^\d+$/.test(r) && !e.id) { const id = idOf(+d, +r); if (id) e.id = id; }
    log[key(0, w, d, r)] = e;
  }
  S.log = log;
  S.block = Number.isInteger(S.block) ? S.block : 0;
  if (S.active && S.active.b == null) S.active.b = S.block;
  S.logV = LOG_V;
  return S;
}

const hasData = e => !!e && (!!e.kg || (e.reps || []).some(Boolean));

/**
 * Letzter Eintrag derselben Übung vor (b, w): erst frühere Wochen dieses Blocks, dann frühere Blöcke.
 * Deload-Wochen (w = 3) aus früheren Blöcken zählen nicht, damit ein neuer Block nicht beim leichten Gewicht startet.
 * Gesucht wird am selben Trainingstag, bevorzugt an derselben Stelle. → { b, w, kg, reps, sets } oder null
 */
export function lastEntry(log, { b, w, di, ri, id }) {
  for (let bb = b; bb >= 0; bb--) {
    for (let ww = bb === b ? w - 1 : 3; ww >= 0; ww--) {
      if (bb !== b && ww === 3) continue;
      const same = log[key(bb, ww, di, ri)];
      if (hasData(same) && (!id || !same.id || same.id === id)) return { b: bb, w: ww, ...same };
      if (!id) continue;
      const pre = `${bb}-${ww}-${di}-`;
      for (const [k, e] of Object.entries(log)) if (k.startsWith(pre) && e.id === id && hasData(e)) return { b: bb, w: ww, ...e };
    }
  }
  return null;
}

// ---------- Wochen- und Blockwechsel ----------

/** Montag der Woche als „2026-11-09“ (lokale Zeit). */
export function mondayOf(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Soll die Woche automatisch weiterspringen? Ja, wenn seit dem Start der aktuellen Woche ein neuer Kalender-Montag
 * begonnen hat, in der aktuellen Woche trainiert wurde und es noch eine nächste Woche gibt.
 * since = Montag, an dem die Woche begann; trained = in dieser Woche schon etwas erledigt.
 */
export const shouldAdvance = ({ week, last, since, trained, now }) => !!since && week < last && trained && mondayOf(now) > since;

// ---------- Kraft-Fortschritt ----------

/** Geschätztes Maximalgewicht für 1 Wiederholung (Epley). Nur bis 15 Wdh. sinnvoll. */
export const epley = (kg, reps) => (kg > 0 && reps > 0 && reps <= 15 ? (reps === 1 ? kg : kg * (1 + reps / 30)) : null);

/**
 * Verlauf einer Übung über alle Blöcke und Wochen (ohne Deload-Wochen), ältester zuerst.
 * timed = Halteübung (Sekunden). Mit Gewicht → bestes geschätztes 1RM der Woche, ohne Gewicht → meiste Wdh./Sekunden.
 * → { unit: "kg" | "Wdh." | "s", points: [{ b, w, v, kg, reps }] }
 */
export function progressOf(log, id, timed = false) {
  const byWeek = new Map();
  for (const [k, e] of Object.entries(log)) {
    if (e.id !== id) continue;
    const [b, w] = k.split("-").map(Number);
    if (w === 3) continue;                                   // Deload ist absichtlich leichter und würde die Kurve drücken
    const kg = parseFloat(String(e.kg).replace(",", ".")) || 0;
    const reps = (e.reps || []).filter((n, i) => n > 0 && (e.sets?.[i] ?? true));
    if (!reps.length) continue;
    const best = Math.max(...reps);
    const v = kg && !timed ? Math.max(...reps.map(r => epley(kg, r) || 0)) : best;
    if (!v) continue;
    const at = `${b}-${w}`, old = byWeek.get(at);
    if (!old || v > old.v) byWeek.set(at, { b, w, v: Math.round(v * 10) / 10, kg, reps: best, weighted: !!kg && !timed });
  }
  const points = [...byWeek.values()].sort((x, y) => x.b - y.b || x.w - y.w);
  // Gemischt (erst ohne, dann mit Gewicht): nur die Einträge mit Gewicht zeigen
  const weighted = points.filter(p => p.weighted);
  const use = weighted.length ? weighted : points;
  return { unit: weighted.length ? "kg" : timed ? "s" : "Wdh.", points: use.map(({ weighted, ...p }) => p) };
}

/** Zusammenfassung für den Verlauf: { id, unit, now, first, change, n } je Übung mit mindestens einem Eintrag. */
export function progressList(log, ids, timedOf = () => false) {
  return ids.map(id => {
    const { unit, points } = progressOf(log, id, timedOf(id));
    if (!points.length) return null;
    const now = points[points.length - 1].v, first = points[0].v;
    return { id, unit, now, first, change: Math.round((now - first) * 10) / 10, n: points.length, points };
  }).filter(Boolean).sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
}

/** Alle Übungen im Log (für den Verlauf). */
export const loggedIds = log => [...new Set(Object.values(log).map(e => e.id).filter(Boolean))];

// ---------- Datensicherung ----------

/** Backup-Erinnerung fällig? Ab 3 Trainings, wenn das letzte Backup (oder das erste Training) über 30 Tage her ist. */
export function backupDue({ history = [], lastBackup = null, snooze = null, now = new Date() }) {
  if (history.length < 3) return false;
  const day = 86_400_000, t = +new Date(now);
  if (snooze && t - +new Date(snooze) < 7 * day) return false;
  const ref = lastBackup || history[0].date;
  return t - +new Date(ref) > 30 * day;
}

// ---------- Laufplan fortsetzen ----------

const NEXT_GOAL = { start: "fit", fit: "5k", "5k": "10k", "10k": "hm", hm: "hm" };

/** Vorschlag für den nächsten Laufplan nach 8 Wochen: nächstes Ziel, eine Stufe erfahrener, 5-km-Zeit aus der GPS-Bestzeit. */
export function nextRunPlan(p, best5k) {
  const t5 = best5k && (!p.t5 || best5k < p.t5) ? best5k : p.t5 ?? null;
  return { goal: NEXT_GOAL[p.goal] || p.goal, level: String(Math.min(3, +p.level + 1)), wd: p.wd.slice(), t5 };
}
