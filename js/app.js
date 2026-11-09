import { QUESTIONS, DEFAULT, label, SCHEME, WEEKS, WEEKDAYS, WEEKDAYS_LONG } from "./data.js";
import { buildPlan, prescription, minutes, cardioItems, propOf, trainingDays, suggestLoad } from "./plan.js";
import { warmupFor, stretchFor, mobMinutes } from "./mobility.js";
import { exportBackup, backupName, parseBackup, icsReminders, icsName } from "./backup.js";
import { figure, mountFigures } from "./figure.js";
import { HOWTO } from "./howto.js";
import { ACTIVITIES, actLabel, RPE, WEEK_GOAL, INTENSE_RPE, normalize, pace, summary } from "./endurance.js";
import { simplify, encodeTrack, decodeTrack, bestEfforts, bestOf, isRecord, trackShape } from "./track.js";
import { hrZones, segZone, sessZone, normBody, bodyStats, nutrition } from "./health.js";
import { RUN_GOALS, RUN_LEVELS, RUN_WEEKS, runPhase, SESSIONS, SEG, buildRunWeek, segAt, totalSec, targetPace, fmtPace, parseTime, trackAdd, trackResume, kmStats, MAX_ACC } from "./run.js";

const KEY = "satzwerk-v3";
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0"); };
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

// ---------- Zustand ----------
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
if (!S || !S.profile) S = null;
else S = { overrides: {}, log: {}, week: 0, day: null, history: [], active: null, cardio: [], run: { p: null, week: 0, done: {} }, runActive: null, body: [], health: {}, ...S };
if (S) S.settings = { voice: true, wake: true, remind: "18:00", ...S.settings };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
let tab = "heute";

const plan = () => buildPlan(S.profile, S.overrides);
const rec = (w, d, r) => S.log[`${w}-${d}-${r}`] || { sets: [], kg: "", reps: [] };
const recW = (w, d, r) => S.log[`${w}-${d}-${r}`] || (S.log[`${w}-${d}-${r}`] = { sets: [], kg: "", reps: [] });
const todayIdx = () => (new Date().getDay() + 6) % 7;

function dayProgress(day, di, w) {
  let t = 0, d = 0;
  if (day.kind === "cardio") cardioItems(day, w, S.profile).forEach((_, ri) => { t++; d += rec(w, di, "c" + ri).sets[0] ? 1 : 0; });
  else {
    day.rows.forEach((r, ri) => { const n = prescription(S.profile, r, w).sets; t += n; d += rec(w, di, ri).sets.slice(0, n).filter(Boolean).length; });
    if (day.fin) { t++; d += rec(w, di, "f").sets[0] ? 1 : 0; }
  }
  return { t, d, ok: t > 0 && d >= t };
}
function selectedDay(pl) {
  if (S.day != null && S.day < pl.days.length) return S.day;
  const i = pl.days.findIndex(d => d.wd >= todayIdx());
  return i < 0 ? 0 : i;
}
// Gewicht aus der letzten Woche mit Eintrag
function lastEntry(w, di, ri) {
  for (let x = w - 1; x >= 0; x--) { const r = rec(x, di, ri); if (r.kg || r.reps.some(Boolean)) return { w: x, ...r }; }
  return null;
}
const hasWeight = ex => ["kb", "kh", "lh"].some(t => ex.t.includes(t));
const kgStep = ex => ex.t.includes("kb") ? 2 : ex.t.includes("lh") ? 2.5 : 1;
const kgStart = ex => ex.t.includes("kb") ? 8 : ex.t.includes("lh") ? 20 : 5;

// ---------- Hauptansicht ----------
function render() {
  if (!S) return openWizard();
  $("#app").hidden = false;
  $("#wizard").hidden = true;
  const w = S.week;
  $("#top-sub").textContent = tab === "laufen" ? (S.run.p ? `Laufplan · Woche ${S.run.week + 1} von ${RUN_WEEKS} · ${runPhase(S.run.p.goal, S.run.week)}` : "Laufplan") : `Woche ${w + 1} von 4 · ${WEEKS[w].n}`;
  document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
  $("#view").innerHTML = tab === "heute" ? viewToday() : tab === "woche" ? viewWeek() : tab === "laufen" ? viewRun() : viewHistory();
  mountFigures($("#view"));
}

function viewToday() {
  const pl = plan(), w = S.week, sel = selectedDay(pl), day = pl.days[sel], pr = dayProgress(day, sel, w);
  const active = S.active && S.active.w === w && S.active.di === sel;
  const btn = active ? "Training fortsetzen" : pr.ok ? "Nochmal trainieren" : pr.d ? "Weiter trainieren" : "Training starten";
  const nEx = day.kind === "cardio" ? cardioItems(day, w, S.profile).length : day.rows.length;
  const firstFig = day.kind === "cardio" ? figure("carry", null) : figure(day.rows[0].ex.a, propOf(day.rows[0].ex));

  let h = `<div class="strip" role="group" aria-label="Trainingstag wählen">${WEEKDAYS.map((wd, i) => {
    const di = pl.days.findIndex(d => d.wd === i), today = i === todayIdx() ? " today" : "";
    if (di < 0) return `<div class="${today}"><b>${wd}</b><span class="dot"></span></div>`;
    const ok = dayProgress(pl.days[di], di, w).ok ? " ok" : "";
    return `<button type="button" class="${ok}${today}" data-day="${di}" aria-pressed="${di === sel}" aria-label="${WEEKDAYS_LONG[i]}: ${esc(pl.days[di].name)}"><b>${wd}</b><span class="dot"></span></button>`;
  }).join("")}</div>

  <section class="hero" aria-label="Training des Tages">
    <div class="hero-top"><div>
      <p class="eyebrow">${WEEKDAYS_LONG[day.wd]}${day.wd === todayIdx() ? " · Heute" : ""}</p>
      <h2>${esc(day.name)}</h2>
      <p class="meta">${nEx} ${day.kind === "cardio" ? "Abschnitte" : "Übungen"} · ca. ${minutes(S.profile, day, w)} min${day.fin ? " · Finisher" : ""}</p>
    </div>${firstFig}</div>
    <div>
      <div class="prog"><i style="width:${pr.t ? pr.d / pr.t * 100 : 0}%"></i></div>
      <div class="hero-row" style="margin-top:6px"><span>${pr.ok ? "Erledigt" : `${pr.d} von ${pr.t} Sätzen`}</span><span>Woche ${w + 1} · ${WEEKS[w].n}</span></div>
    </div>
    <button type="button" class="btn-hero" data-act="start">${ICON.play}${btn}</button>
  </section>

  <section><div class="sec-h"><h2>${day.kind === "cardio" ? "Ablauf" : "Übungen"}</h2><span>Antippen für die Anleitung</span></div><div class="list">`;

  if (day.kind === "cardio") {
    h += cardioItems(day, w, S.profile).map((t, ri) => `<div class="fin-card"><b>Abschnitt ${ri + 1}</b>${esc(t)}</div>`).join("");
  } else {
    day.rows.forEach((r, ri) => {
      const x = prescription(S.profile, r, w), done = rec(w, sel, ri).sets.slice(0, x.sets).filter(Boolean).length;
      h += `<button type="button" class="ex-card${done >= x.sets ? " ok" : ""}" data-ex="${ri}">
        ${figure(r.ex.a, propOf(r.ex))}
        <span><span class="nm">${esc(r.ex.n)}</span><span class="rx" style="display:block">${x.sets} × ${x.reps}${r.ex.side ? " pro Seite" : ""} · ${x.rest} s Pause</span></span>
        <span class="st">${done >= x.sets ? "✓" : `${done}/${x.sets}`}</span>
      </button>`;
    });
    if (day.fin) h += `<div class="fin-card"><b>Finisher</b>${esc(day.fin)}</div>`;
  }
  h += `</div></section><p class="note"><strong>${WEEKS[w].n}:</strong> ${WEEKS[w].t}</p>`;
  return h;
}

function viewWeek() {
  const pl = plan(), w = S.week, sc = SCHEME[S.profile.goal];
  const prog = WEEKS.map((_, wi) => pl.days.reduce((a, d, di) => { const x = dayProgress(d, di, wi); return { t: a.t + x.t, d: a.d + x.d }; }, { t: 0, d: 0 }));
  return `
  <section><div class="sec-h"><h2>4-Wochen-Block</h2></div>
    <div class="weeks">${WEEKS.map((wk, wi) => {
      const pc = prog[wi].t ? Math.round(prog[wi].d / prog[wi].t * 100) : 0;
      return `<button type="button" class="wk" data-week="${wi}" aria-pressed="${wi === w}"><span class="n">W${wi + 1}</span><span class="l">${wk.n}</span><span class="bar"><i style="width:${pc}%"></i></span></button>`;
    }).join("")}</div>
  </section>
  <p class="note"><strong>${WEEKS[w].n}:</strong> ${WEEKS[w].t}</p>
  <section><div class="sec-h"><h2>Woche ${w + 1}</h2><span>${esc(pl.split)}</span></div>
    <div class="rowlist">${WEEKDAYS.map((wd, i) => {
      const di = pl.days.findIndex(d => d.wd === i);
      if (di < 0) return `<div style="color:var(--muted)"><span class="wd">${wd}</span><span class="mid">Ruhetag</span></div>`;
      const d = pl.days[di], pr = dayProgress(d, di, w);
      return `<button type="button" data-open-day="${di}"><span class="wd">${wd}</span><span class="mid"><b>${esc(d.name)}</b><small>ca. ${minutes(S.profile, d, w)} min</small></span><span class="end${pr.ok ? " ok" : ""}">${pr.ok ? "✓ erledigt" : `${pr.d}/${pr.t}`}</span></button>`;
    }).join("")}</div>
  </section>
  <section><div class="sec-h"><h2>So ist dein Plan aufgebaut</h2></div>
    <div class="kvs">
      <div><small>Hauptübungen</small><b>${sc.main[0]} × ${sc.main[1]}</b></div>
      <div><small>Weitere Übungen</small><b>${sc.acc[0]} × ${sc.acc[1]}</b></div>
      <div><small>Pausen</small><b>${sc.main[2]} s / ${sc.acc[2]} s</b></div>
      <div><small>Steigerung</small><b>Wochenweise</b></div>
    </div>
    <p class="hint" style="margin-top:10px">${sc.label}. RIR heißt Wiederholungen in Reserve: so viele würdest du am Satzende noch schaffen.</p>
  </section>`;
}

function viewHistory() {
  const H = S.history, p = S.profile;
  const tot = H.reduce((a, x) => ({ dur: a.dur + x.dur, sets: a.sets + x.sets, vol: a.vol + x.vol }), { dur: 0, sets: 0, vol: 0 });
  let h = `<section><div class="sec-h"><h2>Bisher</h2></div>
    <div class="kvs">
      <div><small>Trainings</small><span class="big">${H.length}</span></div>
      <div><small>Trainingszeit</small><span class="big">${Math.round(tot.dur / 60)} min</span></div>
      <div><small>Sätze</small><span class="big">${tot.sets}</span></div>
      <div><small>Bewegt</small><span class="big">${Math.round(tot.vol).toLocaleString("de-DE")} kg</span></div>
    </div></section>
  ${viewCardio()}
  ${viewBody()}
  <section><div class="sec-h"><h2>Letzte Trainings</h2></div>`;
  h += H.length ? `<div class="rowlist">${H.slice().reverse().slice(0, 30).map(x => {
    const d = new Date(x.date);
    return `<div><span class="wd">${WEEKDAYS[(d.getDay() + 6) % 7]}</span><span class="mid"><b>${esc(x.name)}</b><small>${d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} · ${x.run ? "Laufen" : "Woche " + (x.w + 1)} · ${x.cardio ? x.cardio.min + " min Ausdauer" + (x.cardio.km ? ", " + String(x.cardio.km).replace(".", ",") + " km" : "") : x.sets + " Sätze"}</small></span><span class="end">${fmt(x.dur)}</span></div>`;
  }).join("")}</div>`
    : `<div class="empty">${figure("hang", null)}Noch kein Training abgeschlossen.<br>Starte dein erstes unter „Training“.</div>`;
  h += `</section>
  <section><div class="sec-h"><h2>Dein Profil</h2></div>
    <div class="kvs">
      <div><small>Ziel</small><b>${label("goal", p.goal)}</b></div>
      <div><small>Schwerpunkt</small><b>${label("focus", p.focus)}</b></div>
      <div><small>Niveau</small><b>${label("level", p.level)}</b></div>
      <div><small>Training</small><b>${trainingDays(p).map(i => WEEKDAYS[i]).join(", ")} · ${p.time} min</b></div>
    </div>
    <p class="hint" style="margin:10px 0 12px">Geräte: ${esc(["Körpergewicht", ...p.tools.map(t => label("tools", t))].join(", "))}</p>
    <div class="btns"><button type="button" class="btn" data-act="wizard">Fragen neu beantworten</button><button type="button" class="btn sec" data-act="reset">Fortschritt löschen</button></div>
    <div id="reset-box"></div>
  </section>
  ${viewSettings()}`;
  return h;
}

// ---------- Einstellungen, Erinnerungen, Datensicherung ----------
function viewSettings() {
  const st = S.settings, tog = (k, t, d) => `<label class="tog"><input type="checkbox" data-set="${k}"${st[k] ? " checked" : ""}><span><b>${t}</b><small>${d}</small></span></label>`;
  return `<section><div class="sec-h"><h2>Einstellungen</h2></div>
    <div class="set-list">
      ${tog("voice", "Sprachansagen", "Übung, Satz, Gewicht, Pausen und Dehnen werden angesagt")}
      ${tog("wake", "Bildschirm bleibt an", navigator.wakeLock ? "Während Training, Lauf und Dehnen geht das Display nicht aus" : "Wird von diesem Browser nicht unterstützt")}
    </div></section>
  <section><div class="sec-h"><h2>Erinnerungen</h2></div>
    <p class="hint" style="margin-bottom:10px">Legt für jeden Trainingstag einen wöchentlichen Termin mit Erinnerung in deinem Kalender an (iPhone, Android, PC). Funktioniert auch, wenn die App geschlossen ist.</p>
    <div class="rem-row"><label>Trainingszeit <input type="time" id="rem-time" value="${esc(st.remind)}"></label>
      <label>Erinnern <select id="rem-lead">${[[0, "zur Startzeit"], [15, "15 min vorher"], [30, "30 min vorher"], [60, "1 h vorher"]].map(([v, t]) => `<option value="${v}"${(st.lead ?? 30) === v ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>
    <div class="btns" style="margin-top:10px"><button type="button" class="btn" data-act="ics">Termine in Kalender übernehmen</button></div>
    <p class="hint" id="rem-msg" aria-live="polite" style="margin-top:8px"></p>
  </section>
  <section><div class="sec-h"><h2>Datensicherung</h2></div>
    <p class="hint" style="margin-bottom:10px">Deine Daten liegen nur auf diesem Gerät. Speichere ab und zu ein Backup, z. B. vor einem Handywechsel.${st.lastBackup ? ` Letztes Backup: ${new Date(st.lastBackup).toLocaleDateString("de-DE")}.` : ""}</p>
    <div class="btns"><button type="button" class="btn" data-act="export">Backup speichern</button><button type="button" class="btn sec" data-act="import">Backup laden</button></div>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <div id="import-box" aria-live="polite"></div>
  </section>`;
}
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
async function saveFile(name, type, text) {
  // iPhone: Kalenderdatei direkt öffnen (Safari fragt „Alle hinzufügen“), Backup über das Teilen-Menü
  if (isIOS() && type === "text/calendar") { location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(text); return; }
  const file = new File([text], name, { type });
  if (isIOS() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
let importData = null;
function settingsClick(t, a) {
  if (a === "ics") {
    const time = $("#rem-time").value, lead = +$("#rem-lead").value, pl = plan();
    try {
      const days = pl.days.map(d => ({ wd: d.wd, name: d.name }));
      if (S.run.p) runWeek(S.run.week).forEach(x => days.push({ wd: x.wd, name: "Laufen: " + x.name }));
      S.settings.remind = time; S.settings.lead = lead; save();
      saveFile(icsName(), "text/calendar", icsReminders({ days, time, lead }));
      $("#rem-msg").textContent = `${days.length} wöchentliche Termine erstellt. Ändert sich dein Plan, die alten Termine im Kalender löschen und neu übernehmen.`;
    } catch (e) { $("#rem-msg").textContent = "Bitte eine gültige Uhrzeit wählen."; }
  }
  if (a === "export") {
    S.settings.lastBackup = new Date().toISOString(); save();
    saveFile(backupName(new Date()), "application/json", exportBackup(S));
    render();
  }
  if (a === "import") $("#import-file").click();
  if (a === "import-yes" && importData) {
    S = { body: [], health: {}, ...importData }; importData = null; save(); tab = "heute"; render(); window.scrollTo(0, 0);
  }
  if (a === "import-no") { importData = null; $("#import-box").innerHTML = ""; }
}
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.dataset && t.dataset.set) { S.settings[t.dataset.set] = t.checked; save(); return; }
  if (t.id === "import-file" && t.files[0]) {
    const box = $("#import-box");
    try {
      importData = parseBackup(await t.files[0].text());
      importData.settings = { voice: true, wake: true, remind: "18:00", ...importData.settings };
      box.innerHTML = `<div class="confirm" style="margin-top:12px"><p><b>Backup laden?</b></p><p class="hint">${importData.history.length} Trainings, ${importData.cardio.length} Ausdauer-Einträge. Die aktuellen Daten auf diesem Gerät werden ersetzt.</p>
        <div class="btns"><button type="button" class="btn warn" data-act="import-yes">Ersetzen</button><button type="button" class="btn sec" data-act="import-no">Abbrechen</button></div></div>`;
    } catch (err) { importData = null; box.innerHTML = `<p class="err" style="margin-top:10px">${esc(err.message)}</p>`; }
    t.value = "";
  }
});

// ---------- Ausdauer ----------
function addCardio(e) {
  const x = normalize(e);
  if (x && e.track) { x.track = e.track; x.best = e.best; }
  if (x) { S.cardio.push(x); S.cardio.sort((a, b) => a.date.localeCompare(b.date)); save(); }
  return x;
}
const day0 = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
function cardioForm(e, withDate = false) {
  const f = (k, lbl, v, extra) => `<label class="field"><span>${lbl}</span><input name="${k}" type="number" inputmode="decimal" value="${esc(v ?? "")}" ${extra}></label>`;
  return `<div class="cform">
    <label class="field wide"><span>Aktivität</span><select name="act">${ACTIVITIES.map(([k, t]) => `<option value="${k}"${e.act === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    ${withDate ? `<label class="field wide"><span>Datum</span><input name="date" type="date" value="${day0(e.date || new Date())}" max="${day0(new Date())}"></label>` : ""}
    ${f("min", "Dauer (min)", e.min, 'min="1" max="600" step="1" required')}
    ${f("km", "Strecke (km)", e.km, 'min="0" max="500" step="0.1" placeholder="optional"')}
    ${f("hr", "Ø Puls", e.hr, 'min="40" max="230" step="1" placeholder="optional"')}
    <label class="field"><span>Anstrengung</span><select name="rpe">${RPE.map((t, i) => i ? `<option value="${i}"${+e.rpe === i ? " selected" : ""}>${i} · ${t}</option>` : `<option value="">–</option>`).join("")}</select></label>
    <p class="hint wide" id="cf-err" aria-live="polite"></p>
  </div>`;
}
function readCardioForm(root) {
  const v = n => root.querySelector(`.cform [name="${n}"]`)?.value ?? "";
  const d = v("date");
  // Gewähltes Datum mittags speichern, damit es in jeder Zeitzone derselbe Tag bleibt
  return { act: v("act"), min: v("min"), km: v("km"), hr: v("hr"), rpe: v("rpe"), ...(d ? { date: new Date(d + "T12:00:00").toISOString() } : {}) };
}
function viewCardio() {
  const E = S.cardio, sm = summary(E);
  const max = Math.max(WEEK_GOAL, ...sm.weeks.map(w => w.pts));
  let h = `<section><div class="sec-h"><h2>Ausdauer</h2><span>Ziel ${WEEK_GOAL} min/Woche</span></div>
    <div class="kvs">
      <div><small>Diese Woche</small><span class="big">${sm.week.min} min</span></div>
      <div><small>Wochenziel</small><span class="big">${sm.goal} %</span></div>
      <div><small>Strecke gesamt</small><span class="big">${(Math.round(sm.total.km * 10) / 10).toLocaleString("de-DE")} km</span></div>
      <div><small>${sm.best ? "Bestes Lauftempo" : "Ø Puls (4 Wochen)"}</small><span class="big">${sm.best ? pace(sm.best).replace(" /km", "") : sm.hr ?? "–"}</span></div>
    </div>
    <div class="cbars" role="img" aria-label="Ausdauer-Minuten der letzten 8 Wochen">${sm.weeks.map((w, i) => `<div><i style="height:${Math.round(w.pts / max * 100)}%"${w.pts >= WEEK_GOAL ? ' class="ok"' : ""}></i><small>${i === sm.weeks.length - 1 ? "jetzt" : w.start.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })}</small></div>`).join("")}</div>
    <p class="hint" style="margin:8px 0 12px">Empfehlung der WHO: 150 min moderat oder 75 min intensiv pro Woche. Einheiten ab Anstrengung ${INTENSE_RPE}/10 zählen doppelt.</p>
    <div class="btns"><button type="button" class="btn" data-act="cardio-add">Ausdauer eintragen</button></div>`;
  const B = bestOf(E);
  if (Object.values(B).some(Boolean)) h += `<div class="sec-h" style="margin-top:16px"><h3>Bestzeiten (GPS)</h3></div>
    <div class="best">${Object.entries(B).map(([d, b]) => `<div><small>${distName(+d)}</small><b>${b ? fmt(b.sec) : "–"}</b><span class="d">${b ? new Date(E[b.i].date).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "2-digit" }) : "noch offen"}</span></div>`).join("")}</div>`;
  if (E.length) h += `<div class="rowlist" style="margin-top:12px">${E.map((e, i) => [e, i]).reverse().slice(0, 20).map(([e, i]) => {
    const d = new Date(e.date), extra = [e.km ? String(e.km).replace(".", ",") + " km" : "", pace(e), e.hr ? e.hr + " bpm" : "", e.rpe ? "RPE " + e.rpe : ""].filter(Boolean).join(" · ");
    return `<button type="button" data-cardio="${i}"><span class="wd">${WEEKDAYS[(d.getDay() + 6) % 7]}</span><span class="mid"><b>${esc(actLabel(e.act))}${e.name ? ` <small style="display:inline">· ${esc(e.name)}</small>` : ""}</b><small>${d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}${extra ? " · " + extra : ""}</small></span><span class="end">${e.min} min</span></button>`;
  }).join("")}</div>`;
  return h + `</section>`;
}
function bestHTML(best) {
  if (!best || !Object.values(best).some(v => v != null)) return "";
  return `<div class="best">${Object.entries(best).map(([d, v]) => `<div><small>${distName(+d)}</small><b>${v != null ? fmt(v) : "–"}</b></div>`).join("")}</div>`;
}

// ---------- Körperwerte, Puls-Zonen, Ernährung ----------
const BODY_F = [["kg", "Gewicht", "kg"], ["waist", "Taille", "cm"], ["fat", "Körperfett", "%"], ["chest", "Brust", "cm"], ["arm", "Oberarm", "cm"], ["hip", "Hüfte", "cm"]];
const n1 = v => String(v).replace(".", ",");
function sparkHTML(series) {
  const pts = series.slice(-20);
  if (pts.length < 2) return "";
  const t0 = +new Date(pts[0].date), t1 = +new Date(pts[pts.length - 1].date) || t0 + 1;
  const vs = pts.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), rng = hi - lo || 1;
  const xy = pts.map(p => [(+new Date(p.date) - t0) / (t1 - t0 || 1) * 300, 50 - (p.v - lo) / rng * 44]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const [lx, ly] = xy[xy.length - 1];
  return `<svg class="spark" viewBox="-4 0 308 56" preserveAspectRatio="none" role="img" aria-label="Gewichtsverlauf von ${n1(pts[0].v)} auf ${n1(pts[pts.length - 1].v)} kg"><path d="${d}"/><circle cx="${lx}" cy="${ly}" r="3"/></svg>`;
}
function viewBody() {
  const B = S.body, H = S.health, kg = bodyStats(B, "kg");
  const shown = BODY_F.map(f => [f, bodyStats(B, f[0])]).filter(([, st]) => st.last != null);
  const chg = st => st.change4w == null ? "" : `<small style="text-transform:none;letter-spacing:0">${st.change4w > 0 ? "+" : ""}${n1(st.change4w)} in 4 Wochen</small>`;
  let h = `<section><div class="sec-h"><h2>Körper</h2>${B.length ? `<span>${new Date(B[B.length - 1].date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>` : ""}</div>`;
  h += shown.length ? `<div class="kvs">${shown.map(([[, t, u], st]) => `<div><small>${t}</small><span class="big">${n1(st.last)} <small style="font-size:.8rem">${u}</small></span>${chg(st)}</div>`).join("")}</div>${sparkHTML(kg.series)}`
    : `<p class="hint" style="margin-bottom:10px">Trage einmal pro Woche Gewicht und Umfänge ein – am besten morgens vor dem Frühstück. Der Taillenumfang zeigt oft mehr als die Waage.</p>`;
  h += `<div class="btns" style="margin-top:12px"><button type="button" class="btn" data-act="body-add">Werte eintragen</button>${B.length ? `<button type="button" class="btn sec" data-act="body-list">Alle Einträge</button>` : ""}</div></section>`;

  // Puls-Zonen
  const Z = zonesNow();
  h += `<section><div class="sec-h"><h2>Puls-Zonen</h2>${Z ? `<span>max ${Z.max} · Ruhe ${Z.rest}${Z.est ? " (geschätzt)" : ""}</span>` : ""}</div>`;
  h += Z ? `<div class="zones">${Z.zones.map(z => `<div><span class="zn">Z${z.z}</span><span><b>${z.n}</b><small>${esc(z.txt)}</small></span><span class="zr">${z.lo}–${z.hi}</span></div>`).join("")}</div>
      <p class="hint" style="margin-top:8px">${H.max ? "Mit deinem gemessenen Maximalpuls" : "Maximalpuls geschätzt aus dem Alter (208 − 0,7 × Alter)"} und der Herzfrequenzreserve (Karvonen). Die Zonen stehen auch im Laufplan bei jedem Abschnitt.${Z.est ? " Miss deinen Ruhepuls morgens im Liegen, dann werden die Zonen genauer." : ""}</p>`
    : `<p class="hint" style="margin-bottom:10px">Mit Alter und Ruhepuls berechnet die App deine fünf Trainingszonen und zeigt sie bei jedem Lauf-Abschnitt an.</p>`;
  h += `<div class="btns" style="margin-top:10px"><button type="button" class="btn${Z ? " sec" : ""}" data-act="health">${Z ? "Angaben ändern" : "Angaben eintragen"}</button></div></section>`;

  // Ernährung
  const N = nutrition({ sex: H.sex, age: H.age, cm: H.cm, kg: kg.last, goal: S.profile.goal, days: trainingDays(S.profile), time: S.profile.time });
  h += `<section><div class="sec-h"><h2>Ernährung</h2>${N ? `<span>Ziel: ${label("goal", S.profile.goal)}</span>` : ""}</div>`;
  h += N ? `<div class="kvs">
      <div><small>Kalorien / Tag</small><span class="big">${N.kcal.toLocaleString("de-DE")}</span><small style="text-transform:none;letter-spacing:0">Bedarf ca. ${N.tdee.toLocaleString("de-DE")} kcal</small></div>
      <div><small>Eiweiß / Tag</small><span class="big"><span style="white-space:nowrap;font-size:1.2rem">${N.protein[0]}–${N.protein[1]} g</span></span></div>
      <div><small>Grundumsatz</small><b>${N.bmr.toLocaleString("de-DE")} kcal</b></div>
      <div><small>Wasser</small><b>ca. ${n1(N.water)} l</b></div>
    </div><p class="hint" style="margin-top:8px">${esc(N.note)}</p>`
    : `<p class="hint">Für Kalorien- und Eiweißziel fehlt noch: ${[!H.sex && "Geschlecht", !H.age && "Alter", !H.cm && "Größe", kg.last == null && "Gewicht (unter „Körper“)"].filter(Boolean).join(", ") || "gültige Angaben"}.</p>`;
  return h + `</section>`;
}
function openBodySheet(i) {
  const e = i == null ? { date: new Date().toISOString() } : S.body[i];
  const f = ([k, t, u]) => `<label class="field"><span>${t} (${u})</span><input name="${k}" type="text" inputmode="decimal" value="${esc(e[k] == null ? "" : n1(e[k]))}" placeholder="optional"></label>`;
  $("#sheet").innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true" aria-label="Körperwerte"><div class="grab"></div>
    <h2>${i == null ? "Körperwerte eintragen" : "Eintrag bearbeiten"}</h2>
    <p class="hint">Alles optional – trag ein, was du gemessen hast. Umfänge mit Maßband, entspannt, an der breitesten Stelle (Taille: auf Höhe Bauchnabel).</p>
    <div class="cform bform"><label class="field wide"><span>Datum</span><input name="date" type="date" value="${day0(e.date)}" max="${day0(new Date())}"></label>${BODY_F.map(f).join("")}<p class="hint wide err" id="bf-err" aria-live="polite"></p></div>
    <div class="btns">${i == null ? "" : `<button type="button" class="btn sec" data-act="b-del" data-i="${i}">Löschen</button>`}<button type="button" class="btn sec" data-act="close">Abbrechen</button><button type="button" class="btn" data-act="b-save" data-i="${i ?? ""}" style="flex:1">Speichern</button></div>
  </div>`;
  $("#sheet").hidden = false;
  $("#sheet .bform [name=kg]").focus({ preventScroll: true });
}
function openBodyList() {
  $("#sheet").innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true" aria-label="Körperwerte"><div class="grab"></div>
    <h2>Alle Einträge</h2>
    <div class="rowlist">${S.body.map((e, i) => [e, i]).reverse().map(([e, i]) => {
      const d = new Date(e.date), vals = BODY_F.filter(([k]) => e[k] != null).map(([k, t, u]) => `${t} ${n1(e[k])} ${u}`).join(" · ");
      return `<button type="button" data-act="b-edit" data-i="${i}"><span class="wd">${WEEKDAYS[(d.getDay() + 6) % 7]}</span><span class="mid"><b>${d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}</b><small>${vals}</small></span></button>`;
    }).join("")}</div>
    <div class="btns" style="margin-top:12px"><button type="button" class="btn sec" data-act="close" style="flex:1">Schließen</button></div>
  </div>`;
  $("#sheet").hidden = false;
}
function openHealthSheet() {
  const H = S.health, f = (k, t, v, x) => `<label class="field"><span>${t}</span><input name="${k}" type="number" inputmode="numeric" value="${esc(v ?? "")}" ${x}></label>`;
  $("#sheet").innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true" aria-label="Deine Angaben"><div class="grab"></div>
    <h2>Deine Angaben</h2>
    <p class="hint">Für Puls-Zonen und Kalorienbedarf. Bleibt nur auf diesem Gerät.</p>
    <div class="cform hform">
      <label class="field"><span>Geschlecht</span><select name="sex"><option value="">–</option><option value="w"${H.sex === "w" ? " selected" : ""}>weiblich</option><option value="m"${H.sex === "m" ? " selected" : ""}>männlich</option></select></label>
      ${f("age", "Alter", H.age, 'min="14" max="100" step="1"')}
      ${f("cm", "Größe (cm)", H.cm, 'min="120" max="230" step="1"')}
      ${f("rest", "Ruhepuls", H.rest, 'min="30" max="110" step="1" placeholder="optional"')}
      ${f("max", "Maximalpuls", H.max, 'min="120" max="230" step="1" placeholder="optional, gemessen"')}
      <p class="hint wide err" id="hf-err" aria-live="polite"></p>
    </div>
    <p class="hint">Ruhepuls: morgens nach dem Aufwachen 1 Minute im Liegen zählen. Den Maximalpuls nur eintragen, wenn du ihn wirklich gemessen hast (z. B. mit Brustgurt).</p>
    <div class="btns"><button type="button" class="btn sec" data-act="close">Abbrechen</button><button type="button" class="btn" data-act="h-save" style="flex:1">Speichern</button></div>
  </div>`;
  $("#sheet").hidden = false;
}

function openCardioSheet(i) {
  const e = i == null ? { act: S.cardio.length ? S.cardio[S.cardio.length - 1].act : "lauf", rpe: 5 } : S.cardio[i];
  $("#sheet").innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true" aria-label="Ausdauer"><div class="grab"></div>
    <h2>${i == null ? "Ausdauer eintragen" : "Eintrag bearbeiten"}</h2>
    ${e.track ? mapHTML(decodeTrack(e.track)) + bestHTML(e.best) : `<p class="hint">Zum Beispiel ein Lauf oder eine Radtour an einem freien Tag.</p>`}
    ${cardioForm(e, true)}
    <div class="btns">${i == null ? "" : `<button type="button" class="btn sec" data-act="c-del" data-i="${i}">Löschen</button>`}<button type="button" class="btn sec" data-act="close">Abbrechen</button><button type="button" class="btn" data-act="c-save" data-i="${i ?? ""}" style="flex:1">Speichern</button></div>
  </div>`;
  $("#sheet").hidden = false;
  $("#sheet .cform [name=min]").focus({ preventScroll: true });
}

// ---------- Ereignisse Hauptansicht ----------
document.querySelector(".tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});
$("#view").addEventListener("click", e => {
  const t = e.target.closest("[data-day],[data-week],[data-open-day],[data-ex],[data-act],[data-cardio],[data-rweek],[data-rsess]");
  if (!t) return;
  if (t.dataset.day) { S.day = +t.dataset.day; save(); render(); return; }
  if (t.dataset.week) { S.week = +t.dataset.week; save(); render(); return; }
  if (t.dataset.openDay) { S.day = +t.dataset.openDay; tab = "heute"; save(); render(); window.scrollTo(0, 0); return; }
  if (t.dataset.ex) { openSheet(+t.dataset.ex); return; }
  const a = t.dataset.act;
  if (a === "start") startWorkout();
  if (a === "wizard") openWizard();
  if (a === "reset") $("#reset-box").innerHTML = `<div class="confirm" style="margin-top:12px"><p>Alle abgehakten Sätze, Gewichte, der Verlauf, die Ausdauer-Einträge und die Körperwerte werden gelöscht.</p><div class="btns"><button type="button" class="btn warn" data-act="reset-yes">Endgültig löschen</button><button type="button" class="btn sec" data-act="reset-no">Abbrechen</button></div></div>`;
  if (a === "reset-no") $("#reset-box").innerHTML = "";
  if (a === "reset-yes") { S.log = {}; S.history = []; S.cardio = []; S.body = []; S.active = null; S.week = 0; S.run.done = {}; S.run.week = 0; S.runActive = null; save(); render(); }
  if (a === "cardio-add") openCardioSheet(null);
  if (a === "body-add") openBodySheet(null);
  if (a === "body-list") openBodyList();
  if (a === "health") openHealthSheet();
  if (t.dataset.cardio) openCardioSheet(+t.dataset.cardio);
  runViewClick(t, a);
  settingsClick(t, a);
});

// ---------- Übungs-Anleitung (Sheet) ----------
// Ausführliche Anleitung aus howto.js, sonst die Kurzfassung aus data.js
function howHTML(ex) {
  const h = HOWTO[ex.id] || {};
  return `${h.m ? `<p class="muscles"><b>Trainiert:</b> ${esc(h.m)}</p>` : ""}
    <ol class="how">${(h.s || ex.s).map(t => `<li>${esc(t)}</li>`).join("")}</ol>
    <p class="cue"><b>Achte darauf:</b> ${esc(ex.c)}</p>
    ${h.b ? `<div class="how-more"><h3>Atmung und Tempo</h3><p>${esc(h.b)}</p></div>` : ""}
    ${h.f ? `<div class="how-more"><h3>Typische Fehler</h3><ul>${h.f.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}
    ${h.v ? `<div class="how-more"><h3>Anpassen</h3><p>${esc(h.v)}</p></div>` : ""}`;
}
let sheetRi = null;
function sheetHTML(ex, x, extra = "") {
  return `<div class="stage">${figure(ex.a, propOf(ex))}</div>
    <div><h2>${esc(ex.n)}</h2>
    <div class="chips" style="margin-top:8px"><span class="chip dark">${x.sets} × ${x.reps}${ex.side ? " pro Seite" : ""}</span><span class="chip">${x.rest} s Pause</span><span class="chip">RIR ${x.rir}</span></div></div>
    ${howHTML(ex)}${extra}`;
}
function openSheet(ri) {
  sheetRi = ri;
  const pl = plan(), di = selectedDay(pl), r = pl.days[di].rows[ri], x = prescription(S.profile, r, S.week);
  const last = lastEntry(S.week + 1, di, ri);
  $("#sheet").innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true" aria-label="${esc(r.ex.n)}"><div class="grab"></div>
    ${sheetHTML(r.ex, x, last && last.kg ? `<p class="last">Zuletzt: ${esc(last.kg)} kg${last.reps.some(Boolean) ? " × " + last.reps.filter(Boolean).join(", ") : ""} (Woche ${last.w + 1})</p>` : "")}
    <div class="btns">${r.alt ? `<button type="button" class="btn sec" data-act="swap">Andere Übung</button>` : ""}<button type="button" class="btn" data-act="close" style="flex:1">Schließen</button></div>
  </div>`;
  $("#sheet").hidden = false;
  mountFigures($("#sheet"));
  $("#sheet [data-act=close]").focus({ preventScroll: true });
}
const closeSheet = () => { $("#sheet").hidden = true; $("#sheet").innerHTML = ""; };
$("#sheet").addEventListener("click", e => {
  if (e.target === $("#sheet")) return closeSheet();
  const a = e.target.closest("[data-act]")?.dataset.act;
  if (a === "close") closeSheet();
  if (a === "c-save" || a === "c-del") {
    const b = e.target.closest("[data-act]"), i = b.dataset.i === "" ? null : +b.dataset.i;
    if (a === "c-del") S.cardio.splice(i, 1);
    else {
      const x = normalize({ ...(i == null ? {} : S.cardio[i]), ...readCardioForm($("#sheet")) });
      if (!x) { $("#cf-err").textContent = "Bitte eine Dauer in Minuten eintragen."; return; }
      if (i != null && S.cardio[i].track) { x.track = S.cardio[i].track; x.best = S.cardio[i].best; }
      if (i == null) S.cardio.push(x); else S.cardio[i] = x;
      S.cardio.sort((p, q) => p.date.localeCompare(q.date));
    }
    save(); closeSheet(); render(); return;
  }
  if (a === "b-edit") { openBodySheet(+e.target.closest("[data-act]").dataset.i); return; }
  if (a === "b-save" || a === "b-del") {
    const b = e.target.closest("[data-act]"), i = b.dataset.i === "" ? null : +b.dataset.i;
    if (a === "b-del") S.body.splice(i, 1);
    else {
      const v = n => $(`#sheet .bform [name="${n}"]`).value, d = v("date");
      const x = normBody({ ...Object.fromEntries(BODY_F.map(([k]) => [k, v(k)])), date: d ? new Date(d + "T08:00:00").toISOString() : undefined });
      if (!x) { $("#bf-err").textContent = "Bitte mindestens einen gültigen Wert eintragen (z. B. Gewicht 30–300 kg)."; return; }
      if (i == null) S.body.push(x); else S.body[i] = x;
      S.body.sort((p, q) => p.date.localeCompare(q.date));
    }
    save(); closeSheet(); render(); return;
  }
  if (a === "h-save") {
    const v = n => $(`#sheet .hform [name="${n}"]`).value.trim();
    const x = { sex: v("sex"), age: v("age") ? +v("age") : null, cm: v("cm") ? +v("cm") : null, rest: v("rest") ? +v("rest") : null, max: v("max") ? +v("max") : null };
    const bad = (x.age != null && (x.age < 14 || x.age > 100)) || (x.cm != null && (x.cm < 120 || x.cm > 230)) || ((x.age != null || x.max != null) && !hrZones(x));
    if (bad) { $("#hf-err").textContent = "Bitte die Werte prüfen: Alter 14–100, Größe 120–230 cm, Ruhepuls 30–110, Maximalpuls 120–230."; return; }
    S.health = x; save(); closeSheet(); render(); return;
  }
  if (a === "run-start") { const i = e.target.closest("[data-act]").dataset.i; closeSheet(); startRun(i === "" ? null : +i); return; }
  if (a === "swap") {
    const pl = plan(), di = selectedDay(pl), slot = pl.days[di].rows[sheetRi].slot, k = `${di}-${slot}`;
    S.overrides[k] = (S.overrides[k] || 0) + 1; save(); render(); openSheet(sheetRi);
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

// ---------- Fragen-Assistent ----------
let step = 0, draft = null;
function openWizard() {
  draft = JSON.parse(JSON.stringify(S ? S.profile : DEFAULT));
  if (!draft.wd) draft.wd = trainingDays(draft).map(String);
  step = 0;
  $("#app").hidden = true;
  $("#wizard").hidden = false;
  renderWizard();
}
function renderWizard() {
  const Q = QUESTIONS[step], last = step === QUESTIONS.length - 1, type = Q.multi ? "checkbox" : "radio";
  const isOn = v => Q.multi ? draft[Q.f].includes(v) : draft[Q.f] === v;
  $("#wizard").innerHTML = `
    <div class="wz-head"><div class="emblem" aria-hidden="true">${$(".emblem").innerHTML}</div><span class="brand">Satzwerk</span><span class="wz-step">${step + 1} / ${QUESTIONS.length}</span></div>
    <div class="wz-bar">${QUESTIONS.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
    <h2 class="wz-q pop" id="wz-q">${Q.q}</h2>
    ${Q.h ? `<p class="hint">${Q.h}</p>` : ""}
    <div class="wz-opts${Q.multi ? " cols" : ""}" role="${Q.multi ? "group" : "radiogroup"}" aria-labelledby="wz-q">
      ${Q.o.map(([v, t, d]) => `<label class="opt"><input type="${type}" name="${Q.f}" id="${Q.f}-${v}" value="${v}"${isOn(v) ? " checked" : ""}><span><b>${t}</b>${d ? `<small>${d}</small>` : ""}</span></label>`).join("")}
    </div>
    ${last && S && Object.keys(S.log).length ? `<p class="hint">Ein neuer Plan setzt die abgehakten Sätze zurück. Dein Verlauf bleibt erhalten.</p>` : ""}
    ${Q.min ? `<p class="hint" id="wz-count" aria-live="polite"></p>` : ""}
    <div class="wz-nav">
      ${step > 0 ? `<button type="button" class="btn sec" data-act="back">Zurück</button>` : S ? `<button type="button" class="btn sec" data-act="cancel">Abbrechen</button>` : ""}
      <button type="submit" class="btn" id="wz-go">${last ? "Plan erstellen" : "Weiter"}</button>
    </div>`;
  checkStep();
  window.scrollTo(0, 0);
}
// Mindest- und Höchstzahl bei Mehrfachauswahl (Trainingstage)
function stepValid() {
  const Q = QUESTIONS[step];
  return !Q.min || (draft[Q.f].length >= Q.min && draft[Q.f].length <= Q.max);
}
function checkStep() {
  const Q = QUESTIONS[step], n = Q.min ? draft[Q.f].length : 0;
  $("#wz-go").disabled = !stepValid();
  if (Q.min) $("#wz-count").textContent = n < Q.min ? `Noch ${Q.min - n} ${Q.min - n === 1 ? "Tag" : "Tage"} auswählen.` : n > Q.max ? `Höchstens ${Q.max} Tage, bitte ${n - Q.max} abwählen.` : `${n} Trainingstage pro Woche.`;
}
$("#wizard").addEventListener("change", e => {
  const Q = QUESTIONS[step];
  draft[Q.f] = Q.multi ? [...document.querySelectorAll(`#wizard input[name="${Q.f}"]:checked`)].map(i => i.value) : e.target.value;
  checkStep();
});
$("#wizard").addEventListener("click", e => {
  const a = e.target.closest("[data-act]")?.dataset.act;
  if (a === "back") { step--; renderWizard(); }
  if (a === "cancel") render();
});
$("#wizard").addEventListener("submit", e => {
  e.preventDefault();
  if (!stepValid()) return;
  if (step < QUESTIONS.length - 1) { step++; renderWizard(); return; }
  draft.days = String(draft.wd.length);
  S = { profile: draft, overrides: {}, log: {}, week: 0, day: null, history: S ? S.history : [], active: null, cardio: S ? S.cardio : [], run: S ? S.run : { p: null, week: 0, done: {} }, runActive: S ? S.runActive : null, body: S ? S.body : [], health: S ? S.health : {}, settings: { voice: true, wake: true, remind: "18:00", ...(S ? S.settings : {}) } };
  save();
  tab = "heute";
  render();
});

// ---------- Trainingsmodus ----------
let P = null, tickT = null, lastTick = 0, wake = null, actx = null;

function buildSteps(day, w) {
  const steps = [];
  if (day.kind === "cardio") {
    cardioItems(day, w, S.profile).forEach((t, i) => steps.push({ k: "cardio", i, text: t }));
    stretchFor(day, S.profile).forEach((it, i, a) => steps.push({ k: "mob", ph: "stretch", i, n: a.length, it }));
    steps.push({ k: "clog" });
  } else if (day.kind === "run") {
    stretchFor(day, S.profile).forEach((it, i, a) => steps.push({ k: "mob", ph: "stretch", i, n: a.length, it }));
  } else {
    warmupFor(day, S.profile).forEach((it, i, a) => steps.push({ k: "mob", ph: "warm", i, n: a.length, it }));
    day.rows.forEach((r, ri) => {
      const x = prescription(S.profile, r, w);
      for (let si = 0; si < x.sets; si++) {
        steps.push({ k: "set", ri, si });
        const lastOfAll = ri === day.rows.length - 1 && si === x.sets - 1;
        if (!lastOfAll || day.fin) steps.push({ k: "rest", sec: si === x.sets - 1 ? Math.max(60, Math.min(x.rest, 90)) : x.rest });
      }
    });
    if (day.fin) steps.push({ k: "fin" });
    stretchFor(day, S.profile).forEach((it, i, a) => steps.push({ k: "mob", ph: "stretch", i, n: a.length, it }));
  }
  steps.push({ k: "done" });
  return steps;
}

function startWorkout() {
  const pl = plan(), w = S.week, di = selectedDay(pl), day = pl.days[di];
  const resume = S.active && S.active.w === w && S.active.di === di;
  P = { w, di, day, steps: buildSteps(day, w), idx: 0, elapsed: 0, paused: false, left: 0, total: 0, timed: false, sw: 0, swOn: false, confirm: false, form: {} };
  if (resume) P.elapsed = S.active.elapsed || 0;
  if (resume && S.active.v === 2) P.idx = Math.min(S.active.idx, P.steps.length - 1);
  else {
    // erledigte Sätze überspringen, wenn ein angefangener Tag fortgesetzt wird
    const first = P.steps.findIndex(s => s.k === "set" && !rec(w, di, s.ri).sets[s.si]);
    const anyDone = P.steps.some(s => s.k === "set" && rec(w, di, s.ri).sets[s.si]);
    if (anyDone && !dayProgress(day, di, w).ok && first > 0) P.idx = first;
  }
  openPlayer();
}

function openPlayer() {
  unlockAudio();
  requestWake();
  $("#player").hidden = false;
  document.body.style.overflow = "hidden";
  enterStep();
  lastTick = performance.now();
  clearInterval(tickT);
  tickT = setInterval(tick, 200);
}
// Nur Dehnen, z. B. nach einem Lauf
function startStretch(day) {
  P = { w: 0, di: -1, day, steps: buildSteps(day, 0), idx: 0, elapsed: 0, paused: false, left: 0, total: 0, timed: false, sw: 0, swOn: false, confirm: false, form: {}, only: true };
  openPlayer();
}

function persistActive() { if (P.only) return; S.active = { v: 2, w: P.w, di: P.di, idx: P.idx, elapsed: P.elapsed }; save(); }

function enterStep() {
  const s = P.steps[P.idx];
  P.timed = false; P.left = 0; P.total = 0; P.sw = 0; P.swOn = false; P.confirm = false;
  if (s.k === "rest") { P.left = P.total = s.sec; }
  if (s.k === "mob") { P.left = P.total = s.it.sec; P.half = false; }
  if (s.k === "set") {
    const r = P.day.rows[s.ri], x = prescription(S.profile, r, P.w), rc = rec(P.w, P.di, s.ri), last = lastEntry(P.w, P.di, s.ri);
    P.sug = suggestLoad(x, last, P.w, kgStep(r.ex));
    P.form = { kg: rc.kg || (P.sug && P.sug.kg) || (last && last.kg) || (hasWeight(r.ex) ? String(kgStart(r.ex)) : ""), reps: rc.reps[s.si] || (s.si > 0 && rc.reps[s.si - 1]) || (P.sug && P.sug.reps) || x.hi };
    if (x.timed) { P.left = P.total = (P.sug && P.sug.reps) || x.lo; }
  }
  if (s.k === "clog") P.cform = P.cform || { act: S.cardio.length ? S.cardio[S.cardio.length - 1].act : "lauf", min: Math.max(1, Math.round(P.elapsed / 60)), km: "", hr: "", rpe: P.day.key === "hiit" ? 8 : 4 };
  if (s.k === "done") finishWorkout();
  else persistActive();
  renderPlayer();
  speakStep(s);
}

function segs() {
  const seg = s => s.k !== "rest" && !(s.k === "mob" && s.i > 0);
  const work = P.steps.filter(seg);
  const pos = P.steps.slice(0, P.idx + 1).filter(seg).length - 1;
  return `<div class="segs" aria-hidden="true">${work.slice(0, -1).map((_, i) => `<i class="${i < pos ? "on" : i === pos ? "now" : ""}"></i>`).join("")}</div>`;
}

function nextWork(from) {
  for (let i = from + 1; i < P.steps.length; i++) if (P.steps[i].k !== "rest") return P.steps[i];
  return null;
}
function phaseEnd(from) {
  let i = from;
  while (i < P.steps.length - 1 && P.steps[i].k === "mob" && P.steps[i].ph === P.steps[from].ph) i++;
  return i;
  return null;
}

function renderPlayer() {
  const s = P.steps[P.idx], w = P.w;
  let body = "";
  if (P.confirm) {
    body = P.only ? `<div class="confirm pop"><p><b>Dehnen beenden?</b></p>
      <div class="btns"><button type="button" class="btn" data-p="quit-yes">Beenden</button><button type="button" class="btn sec" data-p="quit-no">Weiter dehnen</button></div></div>` : `<div class="confirm pop"><p><b>Training beenden?</b></p><p class="hint">Deine erledigten Sätze bleiben gespeichert. Du kannst später weitermachen.</p>
      <div class="btns"><button type="button" class="btn" data-p="quit-yes">Beenden</button><button type="button" class="btn sec" data-p="quit-no">Weiter trainieren</button></div></div>`;
  } else if (s.k === "mob") {
    const warm = s.ph === "warm", it = s.it, nx = P.steps[P.idx + 1], last = !(nx && nx.k === "mob" && nx.ph === s.ph);
    const list = P.steps.filter(x => x.k === "mob" && x.ph === s.ph);
    body = `<div><p class="pl-eyebrow">${warm ? "Aufwärmen" : "Dehnen"} · ${s.i + 1} von ${s.n} · ca. ${mobMinutes(list.map(x => x.it))} min</p><h2 class="pl-title">${esc(it.n)}</h2></div>
      <p class="cue" style="font-size:1rem">${esc(it.txt)}${it.side ? " <b>Pro Seite.</b>" : ""}</p>
      ${it.cue ? `<p class="last">${esc(it.cue)}</p>` : ""}
      ${it.sec ? ringHTML(it.side ? (P.half ? "2. Seite" : "1. Seite") : warm ? "Aufwärmen" : "Halten") : ""}
      <ol class="mlist" aria-label="Ablauf">${list.map((x, i) => `<li class="${i < s.i ? "on" : i === s.i ? "now" : ""}">${esc(x.it.n)}</li>`).join("")}</ol>
      <div class="pl-actions"><button type="button" class="btn-go" data-p="next">${last ? (warm ? "Los geht's" : "Fertig") : "Weiter"}</button>
        ${last ? "" : `<button type="button" class="btn sec block" data-p="skip-phase">${warm ? "Aufwärmen" : "Dehnen"} überspringen</button>`}</div>`;
  } else if (s.k === "set") {
    const r = P.day.rows[s.ri], ex = r.ex, x = prescription(S.profile, r, w), last = lastEntry(w, P.di, s.ri);
    const first = s.si === 0;
    body = `<div><p class="pl-eyebrow">Übung ${s.ri + 1} von ${P.day.rows.length}</p><h2 class="pl-title">${esc(ex.n)}</h2></div>
      <div class="target"><span class="big">${x.timed ? x.reps.replace(" s", "") : x.reps}</span><span class="unit">${x.timed ? "Sekunden" : "Wiederholungen"}${ex.side ? " pro Seite" : ""}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div class="dots" aria-label="Satz ${s.si + 1} von ${x.sets}">${Array.from({ length: x.sets }, (_, i) => `<i class="${i < s.si ? "on" : ""}"${i === s.si ? ' style="background:var(--muted);border-color:var(--muted)"' : ""}></i>`).join("")}</div><span class="chip">Satz ${s.si + 1} / ${x.sets} · RIR ${x.rir}</span></div>
      <div class="stage">${figure(ex.a, propOf(ex))}</div>
      <details class="how-box"${first ? " open" : ""}><summary>So geht's</summary><div class="how-body">${howHTML(ex)}</div></details>
      ${x.timed ? ringHTML("Halten") : ""}
      <div class="log">
        ${hasWeight(ex) ? stepper("kg", "kg", P.form.kg || "–") : ""}
        ${stepper("reps", x.timed ? "Sekunden" : "Wdh.", P.form.reps)}
      </div>
      ${last ? `<p class="last">Woche ${last.w + 1}: ${last.kg ? esc(last.kg.replace(".", ",")) + " kg · " : ""}${last.reps.filter(Boolean).join(" / ") || "–"}</p>` : ""}
      ${P.sug && first ? `<p class="sugg${P.sug.up ? " up" : ""}">${P.sug.up ? "↑ " : ""}${esc(P.sug.txt)}</p>` : ""}
      <div class="pl-actions">
        ${x.timed ? `<button type="button" class="btn sec block" data-p="timer">${P.timed ? "Timer stoppen" : `Timer starten (${P.left} s)`}</button>` : ""}
        <button type="button" class="btn-go" data-p="set-done">${ICON.check} Satz geschafft</button>
      </div>`;
  } else if (s.k === "rest") {
    const n = nextWork(P.idx);
    let nx = "";
    if (n && n.k === "set") {
      const r = P.day.rows[n.ri], x = prescription(S.profile, r, w);
      nx = `<div class="next">${figure(r.ex.a, propOf(r.ex))}<div><small>Als Nächstes</small><b>${esc(r.ex.n)}</b><span>Satz ${n.si + 1} von ${x.sets} · ${x.reps}</span></div></div>`;
    } else if (n && n.k === "mob") nx = `<div class="next nofig"><div><small>Als Nächstes</small><b>Dehnen</b><span>${n.n} Übungen · ca. ${mobMinutes(P.steps.filter(x => x.k === "mob" && x.ph === n.ph).map(x => x.it))} min</span></div></div>`;
    else if (n && n.k === "fin") nx = `<div class="next">${figure("swing", "kb")}<div><small>Als Nächstes</small><b>Finisher</b><span>${esc(P.day.fin)}</span></div></div>`;
    body = `<div><p class="pl-eyebrow">Durchatmen</p><h2 class="pl-title">Pause</h2></div>
      ${ringHTML("Pause")}
      <div class="btns" style="justify-content:center"><button type="button" class="btn sec" data-p="minus">−15 s</button><button type="button" class="btn sec" data-p="plus">+15 s</button></div>
      ${nx}
      <div class="pl-actions"><button type="button" class="btn-go" data-p="next">Pause überspringen</button></div>`;
  } else if (s.k === "fin" || s.k === "cardio") {
    const isFin = s.k === "fin";
    body = `<div><p class="pl-eyebrow">${isFin ? "Zum Schluss" : `Abschnitt ${s.i + 1} von ${cardioItems(P.day, w, S.profile).length}`}</p><h2 class="pl-title">${isFin ? "Finisher" : esc(P.day.name)}</h2></div>
      <p class="cue" style="font-size:1rem">${esc(isFin ? P.day.fin : s.text)}</p>
      ${isFin ? `<div class="stage">${figure("swing", S.profile.tools.includes("kb") ? "kb" : null)}</div>` : ""}
      <div class="sw"><span class="pl-eyebrow">Stoppuhr</span><span class="t" id="p-sw">${fmt(P.sw)}</span>
        <div class="btns"><button type="button" class="btn" data-p="sw">${P.swOn ? "Stopp" : P.sw ? "Weiter" : "Start"}</button><button type="button" class="btn sec" data-p="sw-reset">Zurücksetzen</button></div></div>
      <div class="pl-actions"><button type="button" class="btn-go" data-p="block-done">${ICON.check} Erledigt</button></div>`;
  } else if (s.k === "clog") {
    body = `<div><p class="pl-eyebrow">Ausdauer eintragen</p><h2 class="pl-title">Wie lief's?</h2></div>
      <p class="hint">Mit Dauer, Strecke und Puls siehst du im Verlauf, wie sich deine Ausdauer entwickelt. Felder ohne Wert bleiben leer.</p>
      ${cardioForm(P.cform)}
      <div class="pl-actions"><button type="button" class="btn-go" data-p="clog-save">${ICON.check} Speichern</button><button type="button" class="btn sec block" data-p="clog-skip">Ohne Eintrag abschließen</button></div>`;
  } else if (s.k === "done" && P.only) {
    body = `<div class="done-hero pop"><div class="check">${ICON.check}</div><p class="disp">Gedehnt</p><p>${fmt(P.elapsed)} min · gute Erholung</p></div>
      <div class="pl-actions"><button type="button" class="btn-go" data-p="close">Fertig</button></div>`;
  } else if (s.k === "done") {
    const h = S.history[S.history.length - 1];
    body = `<div class="done-hero pop"><div class="check">${ICON.check}</div><p class="disp">Geschafft</p><p>${esc(P.day.name)} · Woche ${w + 1}</p></div>
      <div class="kvs">
        <div><small>Dauer</small><span class="big">${fmt(h.dur)}</span></div>
        <div><small>Sätze</small><span class="big">${h.sets}</span></div>
        ${h.cardio ? `<div><small>Ausdauer</small><span class="big">${h.cardio.min} min</span></div>
        <div><small>${h.cardio.km ? "Strecke" : "Anstrengung"}</small><span class="big">${h.cardio.km ? String(h.cardio.km).replace(".", ",") + " km" : h.cardio.rpe ? h.cardio.rpe + "/10" : "–"}</span></div>`
        : `<div><small>Wiederholungen</small><span class="big">${h.reps}</span></div>
        <div><small>Bewegt</small><span class="big">${Math.round(h.vol).toLocaleString("de-DE")} kg</span></div>`}
      </div>
      <p class="note">${w < 3 ? "Nächste Woche: " + WEEKS[w + 1].t : "Block geschafft. Starte einen neuen Block mit etwas mehr Gewicht."}</p>
      <div class="pl-actions"><button type="button" class="btn-go" data-p="close">Fertig</button></div>`;
  }
  const done = s.k === "done";
  $("#player").innerHTML = `<div class="pl">
    <div class="pl-top">
      <div class="pl-side">${done ? "" : `<button type="button" class="icon-btn" data-p="quit" aria-label="${P.only ? "Dehnen beenden" : "Training beenden"}">${ICON.close}</button>`}${voiceBtn("p")}</div>
      <button type="button" class="clock${P.paused ? " paused" : ""}" data-p="pause" aria-label="${P.paused ? "Stoppuhr fortsetzen" : "Stoppuhr pausieren"}" ${done ? "disabled" : ""}>${P.paused ? ICON.play : ICON.pause}<span id="p-clock">${fmt(P.elapsed)}</span></button>
      <div class="pl-side end">${wakeBadge()}${P.idx > 0 && !done ? `<button type="button" class="icon-btn" data-p="prev" aria-label="Zurück">${ICON.back}</button>` : ""}</div>
    </div>
    ${done ? "" : segs()}
    ${body}
  </div>`;
  mountFigures($("#player"));
  updateRing();
}

function ringHTML(sub) {
  return `<div class="ring-wrap"><svg class="ring" viewBox="0 0 120 120" role="timer" aria-live="off">
    <circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" id="p-ring" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/>
    <text x="60" y="57" id="p-left">${fmt(P.left)}</text><text x="60" y="80" class="sub">${sub}</text></svg></div>`;
}
function stepper(k, lbl, v) {
  return `<div class="stepper"><button type="button" data-p="dec" data-k="${k}" aria-label="${lbl} verringern">−</button><div><output id="p-${k}">${esc(v)}</output><small>${lbl}</small></div><button type="button" data-p="inc" data-k="${k}" aria-label="${lbl} erhöhen">+</button></div>`;
}
function updateRing() {
  const ring = document.getElementById("p-ring"), left = document.getElementById("p-left");
  if (!ring || !P.total) return;
  ring.style.strokeDashoffset = String(326.7 * (1 - P.left / P.total));
  left.textContent = fmt(P.left);
}

function tick() {
  if (!P) return;
  const now = performance.now(), dt = (now - lastTick) / 1000;
  lastTick = now;
  if (P.paused) return;
  const s = P.steps[P.idx];
  if (s.k === "done") return;
  P.elapsed += dt;
  const c = document.getElementById("p-clock");
  if (c) c.textContent = fmt(P.elapsed);
  if (P.swOn) { P.sw += dt; const e = document.getElementById("p-sw"); if (e) e.textContent = fmt(P.sw); }
  const counting = s.k === "rest" || (s.k === "set" && P.timed) || (s.k === "mob" && P.total);
  if (counting && P.left > 0) {
    const before = Math.ceil(P.left);
    P.left = Math.max(0, P.left - dt);
    const after = Math.ceil(P.left);
    if (after !== before && after <= 3 && after > 0) beep(660, .08);
    if (after !== before && after === 10 && s.k === "rest" && P.total > 20) speakNext();
    if (s.k === "mob" && s.it.side && !P.half && P.left <= P.total / 2) {
      P.half = true; beep(880, .15); vibrate(150); say("Seite wechseln.");
      const sub = document.querySelector("#p-left + .sub"); if (sub) sub.textContent = "2. Seite";
    }
    updateRing();
    if (P.left === 0) {
      beep(990, .25); vibrate([200, 100, 200]);
      if (s.k === "rest" || s.k === "mob") next();
      else if (s.k === "set") completeSet();
    }
  }
  if (Math.round(P.elapsed) % 5 === 0) persistActive();
}

function completeSet() {
  const s = P.steps[P.idx], r = rec(P.w, P.di, s.ri);
  const x = recW(P.w, P.di, s.ri);
  x.sets[s.si] = true;
  x.kg = P.form.kg && P.form.kg !== "–" ? String(P.form.kg) : r.kg;
  x.reps[s.si] = +P.form.reps || 0;
  save();
  next();
}
function next() { if (P.idx < P.steps.length - 1) { P.idx++; enterStep(); } }
function prev() {
  let i = P.idx - 1;
  while (i > 0 && P.steps[i].k === "rest") i--;
  P.idx = Math.max(0, i); enterStep();
}

function finishWorkout() {
  if (P.only) { releaseWake(); return; }
  const day = P.day, w = P.w, di = P.di;
  let sets = 0, reps = 0, vol = 0;
  day.rows.forEach((r, ri) => {
    const x = rec(w, di, ri);
    x.sets.forEach((ok, si) => { if (!ok) return; sets++; const n = x.reps[si] || 0; if (r.ex.u !== "s") { reps += n; vol += (parseFloat(x.kg) || 0) * n; } });
  });
  if (day.kind === "cardio") sets = cardioItems(day, w, S.profile).length;
  const h = { date: new Date().toISOString(), name: day.name, w, dur: Math.round(P.elapsed), sets, reps, vol };
  if (P.clog) h.cardio = { min: P.clog.min, km: P.clog.km, rpe: P.clog.rpe };
  S.history.push(h);
  S.active = null;
  save();
  releaseWake();
}

function closePlayer() {
  clearInterval(tickT);
  P = null;
  $("#player").hidden = true;
  $("#player").innerHTML = "";
  document.body.style.overflow = "";
  releaseWake();
  render();
}

$("#player").addEventListener("click", e => {
  const b = e.target.closest("[data-p]");
  if (!b || !P) return;
  unlockAudio();
  const a = b.dataset.p, s = P.steps[P.idx];
  switch (a) {
    case "next": next(); break;
    case "skip-phase": P.idx = phaseEnd(P.idx); enterStep(); break;
    case "voice": toggleVoice(); renderPlayer(); break;
    case "prev": prev(); break;
    case "pause": P.paused = !P.paused; renderPlayer(); break;
    case "quit": P.confirm = true; renderPlayer(); break;
    case "quit-no": P.confirm = false; renderPlayer(); break;
    case "quit-yes": persistActive(); try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} closePlayer(); break;
    case "close": closePlayer(); break;
    case "set-done": completeSet(); break;
    case "timer": P.timed = !P.timed; if (P.timed) say(`Halten, ${durWords(Math.ceil(P.left))}.`); renderPlayer(); break;
    case "plus": P.left += 15; P.total = Math.max(P.total, P.left); updateRing(); break;
    case "minus": P.left = Math.max(1, P.left - 15); updateRing(); break;
    case "sw": P.swOn = !P.swOn; renderPlayer(); break;
    case "sw-reset": P.sw = 0; P.swOn = false; renderPlayer(); break;
    case "block-done": {
      const key = s.k === "fin" ? "f" : "c" + s.i;
      recW(P.w, P.di, key).sets[0] = true;
      // Finisher mit Stoppuhr zählt als intensive Ausdauer
      if (s.k === "fin" && P.sw >= 60) addCardio({ act: "zirkel", min: Math.round(P.sw / 60), rpe: 8, src: "finisher", name: P.day.name });
      save(); next(); break;
    }
    case "clog-save": {
      const e = normalize({ ...readCardioForm($("#player")), src: "plan", name: P.day.name });
      if (!e) { $("#cf-err").textContent = "Bitte eine Dauer in Minuten eintragen."; break; }
      P.clog = addCardio(e); next(); break;
    }
    case "clog-skip": next(); break;
    case "inc": case "dec": {
      const r = P.day.rows[s.ri], k = b.dataset.k, d = a === "inc" ? 1 : -1;
      if (k === "kg") { const v = parseFloat(P.form.kg) || 0; P.form.kg = String(Math.max(0, +(v + d * kgStep(r.ex)).toFixed(1))); }
      else P.form.reps = Math.max(0, (+P.form.reps || 0) + d * (prescription(S.profile, r, P.w).timed ? 5 : 1));
      document.getElementById("p-" + k).textContent = k === "kg" ? P.form.kg : P.form.reps;
      break;
    }
  }
});

// ---------- Laufen: Plan, Kilometer, Einrichtung ----------
const kmFmt = m => (Math.floor(m / 10) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Nach dem Lauf runden wie beim Speichern, unterwegs abschneiden (Kilometerzähler)
const kmEnd = m => (Math.round(m / 10) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const km1 = k => (Math.round(k * 10) / 10).toLocaleString("de-DE");
// Anstrengung je Abschnitt, wenn keine 5-km-Zeit bekannt ist
const distName = d => d >= 1000 ? `${d / 1000} km` : `${d} m`;
const distWords = d => d === 1000 ? "einen Kilometer" : `${d / 1000} Kilometer`;
// Strecke als SVG (Norden oben), Kilometer-Punkte, Start hohl, Ziel gefüllt
function mapHTML(pts) {
  const sh = pts && pts.length >= 2 ? trackShape(pts, 320, 200, 14) : null;
  if (!sh) return "";
  return `<figure class="map"><svg viewBox="0 0 ${sh.w} ${sh.h}" role="img" aria-label="Laufstrecke">
    <path d="${sh.d}" class="map-line"/>
    ${sh.kms.map(([x, y], i) => `<g class="map-km"><circle cx="${x}" cy="${y}" r="8"/><text x="${x}" y="${y}">${i + 1}</text></g>`).join("")}
    <circle cx="${sh.start[0]}" cy="${sh.start[1]}" r="5" class="map-start"/><circle cx="${sh.end[0]}" cy="${sh.end[1]}" r="5" class="map-end"/>
  </svg><figcaption><span><i class="map-start"></i>Start</span><span><i class="map-end"></i>Ziel</span><span>N ↑</span></figcaption></figure>`;
}
// Pulsbereich für eine Zone oder Zonenspanne, wenn Angaben vorhanden
const zonesNow = () => S.health && (S.health.age || S.health.max) ? hrZones(S.health) : null;
function zoneText(z) {
  const H = zonesNow();
  if (!H || z == null) return "";
  const [lo, hi] = Array.isArray(z) ? z : [z, z], a = H.zones[lo - 1], b = H.zones[hi - 1];
  return `Puls ${a.lo}–${b.hi}`;
}
const EFFORT = { run: "locker · 4–5/10", warm: "sehr locker", cool: "sehr locker", work: "zügig · 8/10", tempo: "zügig · 7/10", rest: "ganz locker traben", walk: "zügig gehen" };
const RUN_RPE = { easy: 4, long: 5, int: 8, tempo: 7, walk: 4 };
let runDraft = null;

const runWeek = w => buildRunWeek(S.run.p, w);
const runDone = (w, i) => !!S.run.done[`${w}-${i}`];
function runPaceList(segs) {
  const p = S.run.p, kinds = [...new Set(segs.map(s => s.k))];
  return `<div class="paces">${kinds.map(k => {
    const tp = targetPace(p.t5, k, p.goal);
    return `<div><small>${SEG[k]}</small><b>${tp ? fmtPace(tp) + " /km" : EFFORT[k]}</b></div>`;
  }).join("")}</div>`;
}

function viewRun() {
  if (!S.run.p || runDraft) return viewRunSetup();
  const p = S.run.p, w = S.run.week, wk = runWeek(w), ks = kmStats(S.cardio);
  const doneN = wk.filter((_, i) => runDone(w, i)).length;
  const goal = RUN_GOALS.find(g => g[0] === p.goal);
  const nextI = wk.findIndex((_, i) => !runDone(w, i));
  const act = S.runActive;
  let h = `<section class="hero km-hero" aria-label="Kilometer">
    <div><p class="eyebrow">Gelaufen diese Woche</p><p class="km-big"><span>${km1(ks.week)}</span> km</p></div>
    <div class="km-row"><div><small>Gesamt</small><b>${km1(ks.total)} km</b></div><div><small>Dieses Jahr</small><b>${km1(ks.year)} km</b></div><div><small>Längster</small><b>${km1(ks.longest)} km</b></div></div>
    ${act ? `<button type="button" class="btn-hero" data-act="run-resume">${ICON.play}Lauf fortsetzen (${fmt(act.t)})</button>`
      : `<button type="button" class="btn-hero" data-act="run-free">${ICON.play}Freier Lauf mit Stoppuhr</button>`}
  </section>

  <section><div class="sec-h"><h2>Laufplan · ${esc(goal[1])}</h2><span>${doneN}/${wk.length} diese Woche</span></div>
    <div class="weeks w8">${Array.from({ length: RUN_WEEKS }, (_, wi) => {
      const n = runWeek(wi).length, d = runWeek(wi).filter((_, i) => runDone(wi, i)).length;
      return `<button type="button" class="wk" data-rweek="${wi}" aria-pressed="${wi === w}" aria-label="Woche ${wi + 1}: ${runPhase(p.goal, wi)}"><span class="n">${wi + 1}</span><span class="l">${runPhase(p.goal, wi)}</span><span class="bar"><i style="width:${d / n * 100}%"></i></span></button>`;
    }).join("")}</div>
  </section>

  <section><div class="sec-h"><h2>Woche ${w + 1} · ${runPhase(p.goal, w)}</h2><span>${wk.reduce((a, s) => a + s.min, 0)} min</span></div>
    <div class="list">${wk.map((s, i) => `<button type="button" class="run-card${runDone(w, i) ? " ok" : ""}${i === nextI ? " next-up" : ""}" data-rsess="${i}">
      <span class="wd">${WEEKDAYS[s.wd]}</span>
      <span class="mid"><span class="nm">${esc(s.name)}</span><span class="rx">${esc(s.text)}</span></span>
      <span class="st">${runDone(w, i) ? "✓" : s.min + " min"}</span>
    </button>`).join("")}</div>
  </section>
  <p class="note"><strong>${runPhase(p.goal, w)}:</strong> ${p.goal === "start" ? (w === 7 ? "Geschafft: 30 Minuten am Stück. Danach kannst du mit „Fit bleiben“ weitermachen." : "Lauf so langsam, dass du dich unterhalten kannst. Gehpausen sind kein Versagen, sondern Plan.") : w === 3 ? "Weniger Umfang, damit der Körper die Belastung verarbeitet." : w === 7 ? "Kürzer und frisch werden. Am Ende der Woche: Testlauf oder Wettkampf." : "Die meisten Kilometer locker laufen; nur Intervalle und Tempo sind hart."}</p>

  <section><div class="sec-h"><h2>Dein Laufprofil</h2></div>
    <div class="kvs">
      <div><small>Ziel</small><b>${esc(goal[1])}</b></div>
      <div><small>Niveau</small><b>${esc(RUN_LEVELS.find(l => l[0] === p.level)[1])}</b></div>
      <div><small>Lauftage</small><b>${p.wd.map(i => WEEKDAYS[i]).join(", ")}</b></div>
      <div><small>5-km-Zeit</small><b>${p.t5 ? fmt(p.t5) + " min" : "–"}</b></div>
    </div>
    <p class="hint" style="margin:10px 0 12px">Der Kilometerzähler nutzt GPS. Lass die App beim Laufen geöffnet, der Bildschirm bleibt an. Auf dem Laufband die Strecke mit +/− eintragen.</p>
    <div class="btns"><button type="button" class="btn sec" data-act="run-setup">Laufplan ändern</button></div>
  </section>`;
  return h;
}

// Vorschlag: Lauftage an Tagen ohne Krafttraining
function initRunDraft() {
  const lift = trainingDays(S.profile), free = [0, 1, 2, 3, 4, 5, 6].filter(i => !lift.includes(i));
  return S.run.p ? { ...S.run.p, wd: S.run.p.wd.map(String), t5s: S.run.p.t5 ? fmt(S.run.p.t5) : "" }
    : { goal: "fit", level: "2", wd: (free.length >= 3 ? free.slice(-3) : [1, 3, 6]).map(String), t5s: "" };
}
function viewRunSetup() {
  if (!runDraft) runDraft = initRunDraft();
  const d = runDraft;
  const radios = (f, list) => `<div class="wz-opts">${list.map(([v, t, x]) => `<label class="opt"><input type="radio" name="r-${f}" value="${v}"${d[f] === v ? " checked" : ""}><span><b>${t}</b><small>${x}</small></span></label>`).join("")}</div>`;
  const n = d.wd.length, ok = n >= 2 && n <= 5;
  return `<section class="run-setup"><div class="sec-h"><h2>Laufplan erstellen</h2></div>
    <p class="hint">8 Wochen mit konkreten Einheiten: lockere Läufe, Intervalle, Tempoläufe und ein Longrun pro Woche.</p>
    <h3 class="q">Was ist dein Ziel?</h3>${radios("goal", RUN_GOALS)}
    <h3 class="q">Wie viel läufst du schon?</h3>${radios("level", RUN_LEVELS)}
    <h3 class="q">An welchen Tagen läufst du?</h3>
    <div class="daypick" role="group" aria-label="Lauftage">${WEEKDAYS.map((t, i) => `<label class="opt"><input type="checkbox" name="r-wd" value="${i}"${d.wd.includes(String(i)) ? " checked" : ""}><span><b>${t}</b></span></label>`).join("")}</div>
    <p class="hint" id="r-count" aria-live="polite">${n < 2 ? `Mindestens 2 Tage auswählen.` : n > 5 ? `Höchstens 5 Tage, bitte ${n - 5} abwählen.` : `${n} Lauftage pro Woche. Der Longrun liegt auf dem letzten Tag.`}</p>
    <h3 class="q">Deine aktuelle 5-km-Zeit <small>(optional)</small></h3>
    <label class="field"><span>Zeit in Minuten, z. B. 28:30</span><input name="r-t5" inputmode="numeric" placeholder="mm:ss" value="${esc(d.t5s || "")}"></label>
    <p class="hint" id="r-err" aria-live="polite">Damit zeigt dir die App für jeden Abschnitt ein Zieltempo pro Kilometer.</p>
    <div class="btns" style="margin-top:6px">${S.run.p ? `<button type="button" class="btn sec" data-act="run-cancel">Abbrechen</button>` : ""}<button type="button" class="btn" data-act="run-make" style="flex:1"${ok ? "" : " disabled"}>Laufplan erstellen</button></div>
  </section>`;
}

$("#view").addEventListener("change", e => {
  if (!runDraft || !e.target.name?.startsWith("r-")) return;
  const f = e.target.name.slice(2);
  if (f === "wd") runDraft.wd = [...document.querySelectorAll('#view input[name="r-wd"]:checked')].map(i => i.value);
  else if (f === "t5") runDraft.t5s = e.target.value;
  else runDraft[f] = e.target.value;
  if (f !== "t5") { render(); }
});

function runViewClick(t, a) {
  if (t.dataset.rweek) { S.run.week = +t.dataset.rweek; save(); render(); return; }
  if (t.dataset.rsess) { openRunSheet(+t.dataset.rsess); return; }
  if (a === "run-setup") { runDraft = initRunDraft(); render(); window.scrollTo(0, 0); }
  if (a === "run-cancel") { runDraft = null; render(); }
  if (a === "run-free") startRun(null, true);
  if (a === "run-resume") startRun(S.runActive.i, S.runActive.i == null, S.runActive.w);
  if (a === "run-make") {
    const raw = $("#view [name=r-t5]").value.trim(), t5 = raw ? parseTime(raw) : null;
    if (raw && !t5) { $("#r-err").textContent = "Bitte die Zeit als Minuten:Sekunden eingeben, zwischen 12:00 und 60:00."; return; }
    const changed = !S.run.p || S.run.p.goal !== runDraft.goal || S.run.p.level !== runDraft.level || S.run.p.wd.join() !== runDraft.wd.join();
    S.run.p = { goal: runDraft.goal, level: runDraft.level, wd: runDraft.wd.map(Number).sort((x, y) => x - y), t5 };
    if (changed) { S.run.week = 0; S.run.done = {}; }
    runDraft = null; save(); render(); window.scrollTo(0, 0);
  }
}

function openRunSheet(i) {
  const s = runWeek(S.run.week)[i], info = SESSIONS[s.key];
  $("#sheet").innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true" aria-label="${esc(s.name)}"><div class="grab"></div>
    <div><p class="pl-eyebrow">${WEEKDAYS_LONG[s.wd]} · Woche ${S.run.week + 1}</p><h2>${esc(s.name)}</h2>
    <div class="chips" style="margin-top:8px"><span class="chip dark">${s.min} min</span><span class="chip">${s.segs.length} ${s.segs.length === 1 ? "Abschnitt" : "Abschnitte"}</span>${runDone(S.run.week, i) ? `<span class="chip ok">✓ erledigt</span>` : ""}</div></div>
    <ol class="how">${s.text.split(" · ").map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    <p class="cue"><b>So läufst du:</b> ${esc(info.h)}${zoneText(sessZone(s.key)) ? ` ${zoneText(sessZone(s.key))} Schläge pro Minute.` : ""}</p>
    ${runPaceList(s.segs)}
    <p class="hint">Die App sagt jeden Abschnitt mit Ton, Vibration und Stimme an und zählt die Kilometer per GPS.</p>
    <div class="btns"><button type="button" class="btn sec" data-act="close">Schließen</button><button type="button" class="btn" data-act="run-start" data-i="${i}" style="flex:1">${ICON.play} Lauf starten</button></div>
  </div>`;
  $("#sheet").hidden = false;
  $("#sheet [data-act=run-start]").focus({ preventScroll: true });
}

// ---------- Laufen: Lauf-Modus mit Stoppuhr, Intervallen und GPS ----------
let R = null, runT = null;

// R.t ist die Stoppuhr; R.off verschiebt nur die Abschnitte (Abschnitt überspringen)
function startRun(i, free = false, week = S.run.week) {
  const w = free ? null : week, sess = free ? null : runWeek(w)[i];
  const resume = S.runActive && S.runActive.i === i && S.runActive.w === w;
  R = { i, w, sess, segs: sess ? sess.segs : [], t: 0, off: 0, last: Date.now(), paused: false, tr: { m: 0 }, extra: 0, base: 0,
    gps: "aus", acc: null, watch: null, segI: -1, splits: [], confirm: false, saving: false, cform: null, pts: [], brk: false };
  if (resume) {
    R.paused = !!S.runActive.paused; R.t = S.runActive.t; R.off = S.runActive.off || 0; R.base = S.runActive.m || 0; R.splits = S.runActive.splits || [];
    R.pts = decodeTrack(S.runActive.trk || ""); R.brk = R.pts.length > 0;
  }
  R.segI = sess ? segAt(R.segs, segPos()).i : -1;
  unlockAudio(); requestWake(); startGps();
  $("#player").hidden = false;
  document.body.style.overflow = "hidden";
  renderRun();
  if (sess && !resume) announce(R.segs[0], true);
  clearInterval(runT); runT = setInterval(runTick, 250);
}

const runM = () => Math.max(0, R.base + (R.tr.m || 0) + R.extra);
const segPos = () => R.t + R.off;
function persistRun() { S.runActive = { i: R.i, w: R.w, paused: R.paused, t: Math.round(R.t), off: Math.round(R.off), m: Math.round(runM()), splits: R.splits, trk: encodeTrack(R.pts) }; save(); }

function startGps() {
  if (!("geolocation" in navigator)) { R.gps = "nicht verfügbar"; return; }
  R.gps = "sucht";
  try {
    R.watch = navigator.geolocation.watchPosition(pos => {
      if (!R) return;
      const c = pos.coords;
      R.acc = Math.round(c.accuracy);
      R.gps = c.accuracy > MAX_ACC ? "ungenau" : "ok";
      if (!R.paused && !R.saving) {
        const prev = R.tr.last;
        R.tr = trackAdd(R.tr, { lat: c.latitude, lon: c.longitude, acc: c.accuracy, t: pos.timestamp || Date.now() });
        if (R.tr.last && R.tr.last !== prev) addPoint();
      }
      runText();
    }, err => { if (R) { R.gps = err.code === 1 ? "nicht erlaubt" : "kein Signal"; runText(); } },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  } catch (e) { R.gps = "nicht verfügbar"; }
}
// Strecke für Karte und Bestzeiten: t = Stoppuhr, m = GPS-Meter; brk = erster Punkt nach einer Pause
function addPoint() {
  const f = R.tr.last;
  R.pts.push({ lat: f.lat, lon: f.lon, t: Math.round(R.t), m: Math.round(R.base + (R.tr.m || 0)), ...(R.brk ? { brk: true } : {}) });
  R.brk = false;
}
function stopGps() { try { R && R.watch != null && navigator.geolocation.clearWatch(R.watch); } catch (e) {} }

function say(t) {
  try {
    if (!window.speechSynthesis || (S && S.settings && !S.settings.voice)) return;
    const u = new SpeechSynthesisUtterance(t); u.lang = "de-DE"; u.rate = 1.05;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
const durWords = s => (s = Math.round(s)) === 60 ? "eine Minute" : s < 120 ? `${s} Sekunden` : `${Math.floor(s / 60)} Minuten${s % 60 ? ` ${s % 60} Sekunden` : ""}`;
function announce(seg, first) {
  beep(990, .3); vibrate(seg.k === "work" || seg.k === "tempo" ? [300, 120, 300, 120, 300] : [400]);
  const tp = targetPace(S.run.p?.t5, seg.k, S.run.p?.goal);
  say(`${first ? "Los geht's. " : ""}${SEG[seg.k]}, ${durWords(seg.sec)}${tp ? `, Tempo ${Math.floor(tp / 60)} ${tp % 60 ? tp % 60 : ""}` : ""}.`);
}

function runTick() {
  if (!R) return;
  const now = Date.now(), dt = (now - R.last) / 1000;
  R.last = now;
  if (R.paused || R.saving) return;
  const before = R.t, pos0 = segPos();
  R.t += dt;
  if (R.sess) {
    const at = segAt(R.segs, segPos()), prevLeft = segAt(R.segs, pos0).left;
    // 3-2-1 vor dem Wechsel
    if (at.i === R.segI && Math.ceil(at.left) !== Math.ceil(prevLeft) && Math.ceil(at.left) <= 3 && at.left > 0) beep(660, .08);
    if (at.i !== R.segI) {
      R.segI = at.i;
      if (at.i < R.segs.length) announce(R.segs[at.i]);
      else { beep(990, .5); vibrate([200, 100, 200, 100, 600]); say("Einheit geschafft. Du kannst auslaufen oder den Lauf beenden."); }
      renderRun();
    }
  }
  // Kilometer-Ansage mit Zeit für diesen Kilometer
  const k = Math.floor(runM() / 1000);
  if (k > R.splits.length) {
    const prevT = R.splits.reduce((a, x) => a + x, 0);
    R.splits.push(Math.round(R.t - prevT));
    beep(880, .15);
    say(`Kilometer ${k}. ${fmtPace(R.splits[R.splits.length - 1]).replace(":", " Minuten ")}.`);
    renderRun();
  }
  if (Math.floor(R.t) % 5 === 0 && Math.floor(before) % 5 !== 0) persistRun();
  runText();
}

// Nur die Zahlen aktualisieren, nicht die ganze Ansicht
function runText() {
  if (!R || R.saving) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const m = runM();
  set("r-clock", fmt(R.t));
  set("r-km", kmFmt(m));
  set("r-pace", m >= 200 && R.t >= 60 ? fmtPace(R.t / (m / 1000)) : "–");
  set("r-gps", gpsText());
  if (R.sess && R.segI < R.segs.length) {
    const at = segAt(R.segs, segPos()), seg = R.segs[at.i];
    set("r-left", fmt(at.left));
    const bar = document.getElementById("r-bar");
    if (bar) bar.style.width = `${Math.min(100, at.into / seg.sec * 100)}%`;
  }
}
const gpsText = () => R.gps === "ok" ? `GPS ±${R.acc} m` : R.gps === "ungenau" ? `GPS ungenau (±${R.acc} m)` : R.gps === "sucht" ? "GPS sucht …" : `GPS ${R.gps}`;

function renderRun() {
  if (!R) return;
  let body;
  if (R.done) {
    const st = stretchFor(R.done, S.profile);
    body = `<div class="done-hero pop"><div class="check">${ICON.check}</div><p class="disp">Gespeichert</p><p>${esc(R.done.name)} · ${kmEnd(R.doneM)} km · ${fmt(R.t)}</p></div>
      ${R.records.length ? `<p class="record">★ Neue Bestzeit: ${R.records.map(d => `${distName(d)} in ${fmt(R.best[d])}`).join(" · ")}</p>` : ""}
      ${mapHTML(R.pts)}
      <p class="hint" style="text-align:center">Jetzt ${st.length} Dehnübungen für Waden, Oberschenkel und Hüfte, ca. ${mobMinutes(st)} min.</p>
      <div class="pl-actions"><button type="button" class="btn-go" data-r="stretch">Dehnen</button><button type="button" class="btn sec block" data-r="close">Fertig</button></div>`;
  } else if (R.saving) {
    body = `<div><p class="pl-eyebrow">Lauf speichern</p><h2 class="pl-title">Wie lief's?</h2></div>
      <div class="kvs"><div><small>Zeit</small><span class="big">${fmt(R.t)}</span></div><div><small>Strecke</small><span class="big">${kmFmt(runM())} km</span></div></div>
      <p class="hint">Strecke und Dauer kannst du noch korrigieren.</p>
      ${cardioForm(R.cform)}
      <div class="pl-actions"><button type="button" class="btn-go" data-r="save">${ICON.check} Speichern</button>
        <div class="btns"><button type="button" class="btn sec" data-r="back" style="flex:1">Weiterlaufen</button><button type="button" class="btn sec" data-r="discard" style="flex:1">Nicht speichern</button></div></div>`;
  } else if (R.confirm) {
    body = `<div class="confirm pop"><p><b>Lauf ohne Speichern verwerfen?</b></p><p class="hint">Zeit und Strecke gehen verloren.</p>
      <div class="btns"><button type="button" class="btn warn" data-r="discard-yes">Verwerfen</button><button type="button" class="btn sec" data-r="discard-no">Zurück</button></div></div>`;
  } else {
    const s = R.sess, done = s && R.segI >= R.segs.length;
    let segHTML = "";
    if (s && !done) {
      const seg = R.segs[R.segI], nx = R.segs[R.segI + 1], tp = targetPace(S.run.p.t5, seg.k, S.run.p.goal);
      const hard = seg.k === "work" || seg.k === "tempo";
      segHTML = `<div class="seg-card${hard ? " hard" : ""}">
        <div class="seg-top"><span class="seg-k">${SEG[seg.k]}</span><span class="seg-n">${R.segI + 1} / ${R.segs.length}</span></div>
        <span class="seg-left" id="r-left">${fmt(segAt(R.segs, segPos()).left)}</span>
        <div class="seg-bar"><i id="r-bar"></i></div>
        <div class="seg-foot"><span>${tp ? `Ziel ${fmtPace(tp)} /km` : EFFORT[seg.k]}${zoneText(segZone(seg.k)) ? ` · ${zoneText(segZone(seg.k))}` : ""}</span><span>${nx ? `Danach: ${SEG[nx.k]} ${fmt(nx.sec)}` : "Danach: geschafft"}</span></div>
      </div>`;
    } else if (done) segHTML = `<div class="seg-card ok"><div class="seg-top"><span class="seg-k">Geschafft</span></div><p style="margin:0">Alle Abschnitte erledigt. Du kannst auslaufen oder den Lauf beenden.</p></div>`;
    body = `<div><p class="pl-eyebrow">${s ? `Woche ${R.w + 1} · ${WEEKDAYS_LONG[s.wd]}` : "Freier Lauf"}</p><h2 class="pl-title">${esc(s ? s.name : "Laufen")}</h2></div>
      ${s ? `<div class="segs" aria-hidden="true">${R.segs.map((x, i) => `<i style="flex:${x.sec}" class="${i < R.segI ? "on" : i === R.segI ? "now" : ""}${x.k === "work" || x.k === "tempo" ? " hard" : ""}"></i>`).join("")}</div>` : ""}
      ${segHTML}
      <div class="run-dist">
        <div class="run-km"><span id="r-km">${kmFmt(runM())}</span><small>km</small></div>
        <div class="run-sub"><span>Ø <b id="r-pace">–</b> /km</span><span id="r-gps">${gpsText()}</span></div>
        <div class="btns" style="justify-content:center"><button type="button" class="btn sec" data-r="km-" aria-label="100 Meter abziehen">− 0,1 km</button><button type="button" class="btn sec" data-r="km+" aria-label="100 Meter hinzufügen">+ 0,1 km</button></div>
      </div>
      ${R.splits.length ? `<div class="splits">${R.splits.map((x, i) => `<span><small>km ${i + 1}</small>${fmtPace(x)}</span>`).slice(-6).join("")}</div>` : ""}
      <div class="pl-actions">
        <button type="button" class="btn-go${R.paused ? "" : " sec-go"}" data-r="pause">${R.paused ? ICON.play + " Weiter" : ICON.pause + " Pause"}</button>
        <button type="button" class="btn sec block" data-r="finish">Lauf beenden</button>
      </div>`;
  }
  $("#player").innerHTML = `<div class="pl run-pl">
    <div class="pl-top">
      <div class="pl-side">${R.done ? "" : `<button type="button" class="icon-btn" data-r="quit" aria-label="Lauf verwerfen">${ICON.close}</button>`}${voiceBtn("r")}</div>
      <button type="button" class="clock${R.paused || R.saving ? " paused" : ""}" data-r="pause" aria-label="${R.paused ? "Stoppuhr fortsetzen" : "Stoppuhr pausieren"}" ${R.saving || R.done ? "disabled" : ""}>${R.paused || R.saving ? ICON.play : ICON.pause}<span id="r-clock">${fmt(R.t)}</span></button>
      <div class="pl-side end">${wakeBadge()}${R.sess && !R.saving && !R.done && R.segI < R.segs.length ? `<button type="button" class="icon-btn" data-r="skip" aria-label="Abschnitt überspringen"><svg viewBox="0 0 24 24"><path d="M6 5l8 7-8 7M18 5v14"/></svg></button>` : ""}</div>
    </div>
    ${body}
  </div>`;
  runText();
}

function closeRun() {
  clearInterval(runT); stopGps();
  try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
  R = null;
  $("#player").hidden = true; $("#player").innerHTML = "";
  document.body.style.overflow = "";
  releaseWake(); render();
}

$("#player").addEventListener("click", e => {
  const b = e.target.closest("[data-r]");
  if (!b || !R) return;
  unlockAudio();
  switch (b.dataset.r) {
    case "pause":
      if (R.done) break;
      R.paused = !R.paused; R.last = Date.now();
      if (!R.paused) { R.tr = trackResume(R.tr); R.brk = R.pts.length > 0; }
      persistRun(); renderRun(); break;
    case "km+": R.extra += 100; runText(); break;
    case "km-": R.extra = Math.max(-(R.base + (R.tr.m || 0)), R.extra - 100); runText(); break;
    case "skip": {
      // An den Anfang des nächsten Abschnitts springen
      const at = segAt(R.segs, segPos()); R.off += at.left + 0.01; runTick(); persistRun(); break;
    }
    case "finish": {
      const key = R.sess ? R.sess.key : null;
      R.saving = true;
      R.cform = { act: "lauf", min: Math.max(1, Math.round(R.t / 60)), km: runM() >= 100 ? (Math.round(runM() / 10) / 100).toFixed(2) : "", hr: "", rpe: key ? RUN_RPE[key] : 5 };
      persistRun(); renderRun(); break;
    }
    case "back": R.saving = false; R.last = Date.now(); R.tr = trackResume(R.tr); R.brk = R.pts.length > 0; renderRun(); break;
    case "save": {
      const x = normalize({ ...readCardioForm($("#player")), src: R.sess ? "laufplan" : "lauf", name: R.sess ? R.sess.name : "Freier Lauf" });
      if (!x) { $("#cf-err").textContent = "Bitte eine Dauer in Minuten eintragen."; break; }
      const prevBest = bestOf(S.cardio);
      if (R.pts.length >= 2) { x.track = encodeTrack(simplify(R.pts)); x.best = bestEfforts(R.pts); }
      // Erst ab dem zweiten GPS-Lauf von Rekorden sprechen
      R.records = x.best ? isRecord(x.best, prevBest).filter(d => prevBest[d]) : [];
      addCardio(x);
      if (R.sess) S.run.done[`${R.w}-${R.i}`] = true;
      S.history.push({ date: x.date, name: R.sess ? R.sess.name : "Freier Lauf", run: true, w: R.w ?? 0, dur: Math.round(R.t), sets: 0, reps: 0, vol: 0, cardio: { min: x.min, km: x.km, rpe: x.rpe } });
      S.runActive = null; save();
      clearInterval(runT); stopGps();
      R.paused = true;
      R.best = x.best; R.done = { kind: "run", key: R.sess ? R.sess.key : "easy", name: R.sess ? R.sess.name : "Freier Lauf" }; R.doneM = runM(); R.saving = false;
      renderRun(); say(R.records.length ? `Lauf gespeichert. Neue Bestzeit über ${R.records.map(distWords).join(" und ")}.` : "Lauf gespeichert."); break;
    }
    case "close": closeRun(); break;
    case "stretch": { const d = R.done; closeRun(); startStretch(d); break; }
    case "voice": toggleVoice(); renderRun(); break;
    case "quit": case "discard": R.confirm = true; R.saving = false; renderRun(); break;
    case "discard-no": R.confirm = false; renderRun(); break;
    case "discard-yes": S.runActive = null; save(); closeRun(); break;
  }
});

// ---------- Ton, Vibration, Bildschirm an ----------
function unlockAudio() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) {}
}
function beep(f, d) {
  if (!actx) return;
  try {
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.frequency.value = f; g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
// Bildschirm bleibt an, solange Training oder Lauf offen sind. Das System gibt die Sperre frei,
// wenn die App in den Hintergrund geht; beim Zurückkehren wird sie neu angefordert.
async function requestWake() {
  if (!S.settings.wake || !navigator.wakeLock || wake || document.visibilityState !== "visible") return updateWake();
  try {
    wake = await navigator.wakeLock.request("screen");
    wake.addEventListener("release", () => { wake = null; updateWake(); });
  } catch (e) { wake = null; }
  updateWake();
}
function releaseWake() { try { wake && wake.release(); } catch (e) {} wake = null; }
const wakeBadge = () => S.settings.wake && navigator.wakeLock ? `<span class="wake${wake ? " on" : ""}" id="wake" title="${wake ? "Bildschirm bleibt an" : "Bildschirm kann ausgehen"}" aria-label="${wake ? "Bildschirm bleibt an" : "Bildschirm kann ausgehen"}" role="img"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></span>` : "";
function updateWake() { const b = document.getElementById("wake"); if (b) b.outerHTML = wakeBadge(); }

// ---------- Sprachansagen ----------
function voiceBtn(attr) {
  const on = S.settings.voice;
  return `<button type="button" class="icon-btn" data-${attr}="voice" aria-pressed="${on}" aria-label="Sprachansagen ${on ? "aus" : "an"}schalten"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg></button>`;
}
function toggleVoice() {
  S.settings.voice = !S.settings.voice; save();
  if (!S.settings.voice) { try { speechSynthesis.cancel(); } catch (e) {} } else say("Sprachansagen an.");
}
const repWords = r => String(r).replace(/[–-]/, " bis ");
const kgWords = kg => String(kg).replace(".", ",") + " Kilo";
function speakStep(s) {
  if (!P) return;
  if (s.k === "mob") {
    const first = s.i === 0, it = s.it;
    say(`${first ? (s.ph === "warm" ? "Aufwärmen. " : "Dehnen. ") : ""}${it.n}${it.sec ? `, ${durWords(it.side ? it.sec / 2 : it.sec)}${it.side ? " pro Seite" : ""}` : ""}.`);
  } else if (s.k === "set") {
    const r = P.day.rows[s.ri], x = prescription(S.profile, r, P.w), kg = hasWeight(r.ex) && P.form.kg && P.form.kg !== "–" ? `, mit ${kgWords(P.form.kg)}` : "";
    say(`${s.si === 0 ? r.ex.n + ". " : ""}Satz ${s.si + 1} von ${x.sets}. ${x.timed ? durWords(P.left) + " halten" : repWords(x.reps) + " Wiederholungen"}${r.ex.side ? " pro Seite" : ""}${kg}.`);
  } else if (s.k === "rest") say(`Pause, ${durWords(s.sec)}.`);
  else if (s.k === "fin") say("Zum Schluss der Finisher.");
  else if (s.k === "cardio") say(s.text);
  else if (s.k === "done") say(P.only ? "Dehnen geschafft. Gute Erholung." : "Training geschafft. Stark!");
}
function speakNext() {
  const n = nextWork(P.idx);
  if (!n) return;
  if (n.k === "set") { const r = P.day.rows[n.ri]; say(`Noch 10 Sekunden. Als Nächstes ${n.si === 0 ? r.ex.n : `Satz ${n.si + 1}`}.`); }
  else if (n.k === "mob") say("Noch 10 Sekunden. Danach dehnen.");
  else if (n.k === "fin") say("Noch 10 Sekunden. Danach der Finisher.");
  else say("Noch 10 Sekunden.");
}
// Im Hintergrund läuft die Zeit weiter: beim Zurückkehren wird die verstrichene Zeit nachgeholt
document.addEventListener("visibilitychange", () => {
  if (P && document.visibilityState === "visible") { tick(); requestWake(); }
  if (R && document.visibilityState === "visible") { runTick(); requestWake(); }
});

// Laufendes Training nicht durch ein App-Update neu laden
window.appBusy = () => !!P || !!R;

// ---------- Start ----------
// Ein unterbrochener Lauf (z. B. App geschlossen) wartet im Tab Laufen
if (S && S.runActive) tab = "laufen";
render();
