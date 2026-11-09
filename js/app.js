import { QUESTIONS, DEFAULT, label, WARMUP, SCHEME, WEEKS, WEEKDAYS, WEEKDAYS_LONG } from "./data.js";
import { buildPlan, prescription, minutes, cardioItems, propOf, trainingDays } from "./plan.js";
import { figure, mountFigures } from "./figure.js";
import { HOWTO } from "./howto.js";
import { ACTIVITIES, actLabel, RPE, WEEK_GOAL, INTENSE_RPE, normalize, pace, summary } from "./endurance.js";

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
else S = { overrides: {}, log: {}, week: 0, day: null, history: [], active: null, cardio: [], ...S };
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
  $("#top-sub").textContent = `Woche ${w + 1} von 4 · ${WEEKS[w].n}`;
  document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
  $("#view").innerHTML = tab === "heute" ? viewToday() : tab === "woche" ? viewWeek() : viewHistory();
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
  <section><div class="sec-h"><h2>Letzte Trainings</h2></div>`;
  h += H.length ? `<div class="rowlist">${H.slice().reverse().slice(0, 30).map(x => {
    const d = new Date(x.date);
    return `<div><span class="wd">${WEEKDAYS[(d.getDay() + 6) % 7]}</span><span class="mid"><b>${esc(x.name)}</b><small>${d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} · Woche ${x.w + 1} · ${x.cardio ? x.cardio.min + " min Ausdauer" + (x.cardio.km ? ", " + String(x.cardio.km).replace(".", ",") + " km" : "") : x.sets + " Sätze"}</small></span><span class="end">${fmt(x.dur)}</span></div>`;
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
  </section>`;
  return h;
}

// ---------- Ausdauer ----------
function addCardio(e) {
  const x = normalize(e);
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
  if (E.length) h += `<div class="rowlist" style="margin-top:12px">${E.map((e, i) => [e, i]).reverse().slice(0, 20).map(([e, i]) => {
    const d = new Date(e.date), extra = [e.km ? String(e.km).replace(".", ",") + " km" : "", pace(e), e.hr ? e.hr + " bpm" : "", e.rpe ? "RPE " + e.rpe : ""].filter(Boolean).join(" · ");
    return `<button type="button" data-cardio="${i}"><span class="wd">${WEEKDAYS[(d.getDay() + 6) % 7]}</span><span class="mid"><b>${esc(actLabel(e.act))}${e.name ? ` <small style="display:inline">· ${esc(e.name)}</small>` : ""}</b><small>${d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}${extra ? " · " + extra : ""}</small></span><span class="end">${e.min} min</span></button>`;
  }).join("")}</div>`;
  return h + `</section>`;
}
function openCardioSheet(i) {
  const e = i == null ? { act: S.cardio.length ? S.cardio[S.cardio.length - 1].act : "lauf", rpe: 5 } : S.cardio[i];
  $("#sheet").innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true" aria-label="Ausdauer"><div class="grab"></div>
    <h2>${i == null ? "Ausdauer eintragen" : "Eintrag bearbeiten"}</h2>
    <p class="hint">Zum Beispiel ein Lauf oder eine Radtour an einem freien Tag.</p>
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
  const t = e.target.closest("[data-day],[data-week],[data-open-day],[data-ex],[data-act],[data-cardio]");
  if (!t) return;
  if (t.dataset.day) { S.day = +t.dataset.day; save(); render(); return; }
  if (t.dataset.week) { S.week = +t.dataset.week; save(); render(); return; }
  if (t.dataset.openDay) { S.day = +t.dataset.openDay; tab = "heute"; save(); render(); window.scrollTo(0, 0); return; }
  if (t.dataset.ex) { openSheet(+t.dataset.ex); return; }
  const a = t.dataset.act;
  if (a === "start") startWorkout();
  if (a === "wizard") openWizard();
  if (a === "reset") $("#reset-box").innerHTML = `<div class="confirm" style="margin-top:12px"><p>Alle abgehakten Sätze, Gewichte, der Verlauf und die Ausdauer-Einträge werden gelöscht.</p><div class="btns"><button type="button" class="btn warn" data-act="reset-yes">Endgültig löschen</button><button type="button" class="btn sec" data-act="reset-no">Abbrechen</button></div></div>`;
  if (a === "reset-no") $("#reset-box").innerHTML = "";
  if (a === "reset-yes") { S.log = {}; S.history = []; S.cardio = []; S.active = null; S.week = 0; save(); render(); }
  if (a === "cardio-add") openCardioSheet(null);
  if (t.dataset.cardio) openCardioSheet(+t.dataset.cardio);
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
      if (i == null) S.cardio.push(x); else S.cardio[i] = x;
      S.cardio.sort((p, q) => p.date.localeCompare(q.date));
    }
    save(); closeSheet(); render(); return;
  }
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
  S = { profile: draft, overrides: {}, log: {}, week: 0, day: null, history: S ? S.history : [], active: null, cardio: S ? S.cardio : [] };
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
    steps.push({ k: "clog" });
  } else {
    steps.push({ k: "warm" });
    day.rows.forEach((r, ri) => {
      const x = prescription(S.profile, r, w);
      for (let si = 0; si < x.sets; si++) {
        steps.push({ k: "set", ri, si });
        const lastOfAll = ri === day.rows.length - 1 && si === x.sets - 1;
        if (!lastOfAll || day.fin) steps.push({ k: "rest", sec: si === x.sets - 1 ? Math.max(60, Math.min(x.rest, 90)) : x.rest });
      }
    });
    if (day.fin) steps.push({ k: "fin" });
  }
  steps.push({ k: "done" });
  return steps;
}

function startWorkout() {
  const pl = plan(), w = S.week, di = selectedDay(pl), day = pl.days[di];
  const resume = S.active && S.active.w === w && S.active.di === di;
  P = { w, di, day, steps: buildSteps(day, w), idx: 0, elapsed: 0, paused: false, left: 0, total: 0, timed: false, sw: 0, swOn: false, confirm: false, form: {} };
  if (resume) { P.idx = Math.min(S.active.idx, P.steps.length - 1); P.elapsed = S.active.elapsed || 0; }
  else {
    // erledigte Sätze überspringen, wenn ein angefangener Tag fortgesetzt wird
    const first = P.steps.findIndex(s => s.k === "set" && !rec(w, di, s.ri).sets[s.si]);
    const anyDone = P.steps.some(s => s.k === "set" && rec(w, di, s.ri).sets[s.si]);
    if (anyDone && !dayProgress(day, di, w).ok && first > 0) P.idx = first;
  }
  unlockAudio();
  requestWake();
  $("#player").hidden = false;
  document.body.style.overflow = "hidden";
  enterStep();
  lastTick = performance.now();
  clearInterval(tickT);
  tickT = setInterval(tick, 200);
}

function persistActive() { S.active = { w: P.w, di: P.di, idx: P.idx, elapsed: P.elapsed }; save(); }

function enterStep() {
  const s = P.steps[P.idx];
  P.timed = false; P.left = 0; P.total = 0; P.sw = 0; P.swOn = false; P.confirm = false;
  if (s.k === "rest") { P.left = P.total = s.sec; }
  if (s.k === "warm") { P.left = P.total = 300; P.timed = false; }
  if (s.k === "set") {
    const r = P.day.rows[s.ri], x = prescription(S.profile, r, P.w), rc = rec(P.w, P.di, s.ri), last = lastEntry(P.w, P.di, s.ri);
    P.form = { kg: rc.kg || (last && last.kg) || (hasWeight(r.ex) ? String(kgStart(r.ex)) : ""), reps: rc.reps[s.si] || (s.si > 0 && rc.reps[s.si - 1]) || x.hi };
    if (x.timed) { P.left = P.total = x.lo; }
  }
  if (s.k === "clog") P.cform = P.cform || { act: S.cardio.length ? S.cardio[S.cardio.length - 1].act : "lauf", min: Math.max(1, Math.round(P.elapsed / 60)), km: "", hr: "", rpe: P.day.key === "hiit" ? 8 : 4 };
  if (s.k === "done") finishWorkout();
  else persistActive();
  renderPlayer();
}

function segs() {
  const work = P.steps.filter(s => s.k !== "rest");
  const pos = P.steps.slice(0, P.idx + 1).filter(s => s.k !== "rest").length - 1;
  return `<div class="segs" aria-hidden="true">${work.slice(0, -1).map((_, i) => `<i class="${i < pos ? "on" : i === pos ? "now" : ""}"></i>`).join("")}</div>`;
}

function nextWork(from) {
  for (let i = from + 1; i < P.steps.length; i++) if (P.steps[i].k !== "rest") return P.steps[i];
  return null;
}

function renderPlayer() {
  const s = P.steps[P.idx], w = P.w;
  let body = "";
  if (P.confirm) {
    body = `<div class="confirm pop"><p><b>Training beenden?</b></p><p class="hint">Deine erledigten Sätze bleiben gespeichert. Du kannst später weitermachen.</p>
      <div class="btns"><button type="button" class="btn" data-p="quit-yes">Beenden</button><button type="button" class="btn sec" data-p="quit-no">Weiter trainieren</button></div></div>`;
  } else if (s.k === "warm") {
    body = `<div><p class="pl-eyebrow">Vor dem Training</p><h2 class="pl-title">Aufwärmen</h2></div>
      <ol class="wlist">${WARMUP.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
      ${ringHTML("Aufwärmen")}
      <div class="pl-actions"><button type="button" class="btn-go" data-p="next">Los geht's</button></div>`;
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
      ${last ? `<p class="last">Woche ${last.w + 1}: ${last.kg ? esc(last.kg) + " kg · " : ""}${last.reps.filter(Boolean).join(" / ") || "–"}</p>` : ""}
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
    } else if (n && n.k === "fin") nx = `<div class="next">${figure("swing", "kb")}<div><small>Als Nächstes</small><b>Finisher</b><span>${esc(P.day.fin)}</span></div></div>`;
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
      ${done ? "<span></span>" : `<button type="button" class="icon-btn" data-p="quit" aria-label="Training beenden">${ICON.close}</button>`}
      <button type="button" class="clock${P.paused ? " paused" : ""}" data-p="pause" aria-label="${P.paused ? "Stoppuhr fortsetzen" : "Stoppuhr pausieren"}" ${done ? "disabled" : ""}>${P.paused ? ICON.play : ICON.pause}<span id="p-clock">${fmt(P.elapsed)}</span></button>
      ${P.idx > 0 && !done ? `<button type="button" class="icon-btn" data-p="prev" aria-label="Zurück">${ICON.back}</button>` : "<span></span>"}
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
  const counting = s.k === "rest" || (s.k === "set" && P.timed) || (s.k === "warm" && P.total);
  if (counting && P.left > 0) {
    const before = Math.ceil(P.left);
    P.left = Math.max(0, P.left - dt);
    const after = Math.ceil(P.left);
    if (after !== before && after <= 3 && after > 0) beep(660, .08);
    updateRing();
    if (P.left === 0) {
      beep(990, .25); vibrate([200, 100, 200]);
      if (s.k === "rest") next();
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
    case "prev": prev(); break;
    case "pause": P.paused = !P.paused; renderPlayer(); break;
    case "quit": P.confirm = true; renderPlayer(); break;
    case "quit-no": P.confirm = false; renderPlayer(); break;
    case "quit-yes": persistActive(); closePlayer(); break;
    case "close": closePlayer(); break;
    case "set-done": completeSet(); break;
    case "timer": P.timed = !P.timed; renderPlayer(); break;
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
async function requestWake() { try { wake = await navigator.wakeLock?.request("screen"); } catch (e) { wake = null; } }
function releaseWake() { try { wake && wake.release(); } catch (e) {} wake = null; }
// Im Hintergrund läuft die Zeit weiter: beim Zurückkehren wird die verstrichene Zeit nachgeholt
document.addEventListener("visibilitychange", () => {
  if (P && document.visibilityState === "visible") { tick(); requestWake(); }
});

// Laufendes Training nicht durch ein App-Update neu laden
window.appBusy = () => !!P;

// ---------- Start ----------
render();
