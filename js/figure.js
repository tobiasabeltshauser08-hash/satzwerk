// Animierte Vorlage: Strichfigur in Seitenansicht, die zwischen Start- (A) und Endposition (B) wechselt.
// Posen sind Knochenwinkel in Grad (0 = rechts, 90 = unten), "pin" hält ein Gelenk an der Stelle "at" fest.

const L = { torso: 30, thigh: 22, shin: 22, ua: 15, fa: 14, head: 9 };
const STAND = { pin: "F1", at: [55, 100], t: -90, th1: 90, sh1: 90, ua1: 90, fa1: 90 };
const st = o => ({ ...STAND, ...o });
const PUSH_UP = { pin: "F1", at: [12, 100] };

export const ANIMS = {
  squat: { A: st({}), B: st({ t: -55, th1: 5, sh1: 115, ua1: -5, fa1: -5 }) },
  backsquat: { A: st({ ua1: 115, fa1: -110 }), B: st({ t: -55, th1: 5, sh1: 115, ua1: 140, fa1: -80 }) },
  goblet: { A: st({ ua1: 80, fa1: -100 }), B: st({ t: -55, th1: 5, sh1: 115, ua1: 95, fa1: -60 }) },
  hinge: { A: st({}), B: st({ t: -12, th1: 70, sh1: 95 }) },
  swing: { A: st({ t: -20, th1: 60, sh1: 100, ua1: 110, fa1: 115 }), B: st({ ua1: -5, fa1: -5 }) },
  bridge: {
    A: { pin: "N", at: [22, 96], t: 180, th1: -50, sh1: 70, ua1: 5, fa1: 0 },
    B: { pin: "N", at: [22, 96], t: 160, th1: -20, sh1: 92, ua1: 5, fa1: 0 } },
  lunge: {
    A: { ...STAND, at: [62, 100] },
    B: { ...STAND, at: [62, 100], th1: 10, sh1: 95, th2: 110, sh2: 175 } },
  legcurl: {
    A: { pin: "N", at: [20, 96], t: 180, th1: -8, sh1: 3, ua1: 5, fa1: 0 },
    B: { pin: "N", at: [20, 96], t: 165, th1: -45, sh1: 70, ua1: 5, fa1: 0 } },
  pushup: {
    A: { ...PUSH_UP, t: -23, th1: 157, sh1: 157, ua1: 90, fa1: 90 },
    B: { ...PUSH_UP, t: -9, th1: 171, sh1: 171, ua1: 160, fa1: 40 } },
  bench: {
    A: { pin: "P", at: [45, 75], t: 0, th1: 170, sh1: 100, ua1: -90, fa1: -90 },
    B: { pin: "P", at: [45, 75], t: 0, th1: 170, sh1: 100, ua1: 165, fa1: -90 }, props: ["bench"] },
  floorpress: {
    A: { pin: "P", at: [45, 96], t: 0, th1: -135, sh1: 105, ua1: -90, fa1: -90 },
    B: { pin: "P", at: [45, 96], t: 0, th1: -135, sh1: 105, ua1: 170, fa1: -90 } },
  press: { A: st({ ua1: 95, fa1: -95 }), B: st({ ua1: -88, fa1: -90 }) },
  pike: {
    A: { pin: "F1", at: [22, 100], t: 55, th1: 125, sh1: 125, ua1: 23, fa1: 23 },
    B: { pin: "F1", at: [22, 100], t: 62, th1: 125, sh1: 125, ua1: 0, fa1: 40 } },
  row: { A: st({ t: -15, th1: 70, sh1: 100 }), B: st({ t: -15, th1: 70, sh1: 100, ua1: 200, fa1: 95 }) },
  invrow: {
    A: { pin: "F1", at: [12, 100], t: -10, th1: 170, sh1: 170, ua1: -90, fa1: -90 },
    B: { pin: "F1", at: [12, 100], t: -18, th1: 162, sh1: 162, ua1: -150, fa1: -60 }, props: ["table"] },
  pullup: {
    A: { pin: "W1", at: [65, 6], t: -90, th1: 100, sh1: 135, ua1: -90, fa1: -90 },
    B: { pin: "W1", at: [65, 6], t: -90, th1: 100, sh1: 135, ua1: 80, fa1: -70 }, props: ["bar"], floor: false },
  hang: {
    A: { pin: "W1", at: [65, 6], t: -90, th1: 100, sh1: 135, ua1: -90, fa1: -90 },
    B: { pin: "W1", at: [65, 6], t: -87, th1: 97, sh1: 132, ua1: -90, fa1: -90 }, props: ["bar"], floor: false },
  legraise: {
    A: { pin: "W1", at: [65, 6], t: -90, th1: 95, sh1: 95, ua1: -90, fa1: -90 },
    B: { pin: "W1", at: [65, 6], t: -90, th1: -5, sh1: 90, ua1: -90, fa1: -90 }, props: ["bar"], floor: false },
  latpull: {
    A: { pin: "P", at: [50, 78], t: -90, th1: 0, sh1: 90, ua1: -88, fa1: -90 },
    B: { pin: "P", at: [50, 78], t: -95, th1: 0, sh1: 90, ua1: 80, fa1: -70 }, props: ["seat"] },
  pullover: {
    A: { pin: "P", at: [40, 96], t: 0, th1: -135, sh1: 105, ua1: -10, fa1: -10 },
    B: { pin: "P", at: [40, 96], t: 0, th1: -135, sh1: 105, ua1: -90, fa1: -90 } },
  superman: {
    A: { pin: "P", at: [45, 96], t: -3, th1: 177, sh1: 180, ua1: -15, fa1: -10 },
    B: { pin: "P", at: [45, 96], t: -8, th1: 176, sh1: 178, ua1: 170, fa1: -20 } },
  raise: { A: st({}), B: st({ ua1: -3, fa1: -3 }) },
  curl: { A: st({}), B: st({ ua1: 95, fa1: -70 }) },
  ohext: { A: st({ ua1: -100, fa1: 100 }), B: st({ ua1: -100, fa1: -95 }) },
  pushdown: { A: st({ ua1: 92, fa1: -30 }), B: st({ ua1: 92, fa1: 88 }) },
  dip: {
    A: { pin: "W1", at: [40, 68], t: -90, th1: 25, sh1: 85, ua1: 100, fa1: 95 },
    B: { pin: "W1", at: [40, 68], t: -90, th1: 5, sh1: 80, ua1: 150, fa1: 60 }, props: ["chair"] },
  plank: {
    A: { ...PUSH_UP, t: -12, th1: 168, sh1: 168, ua1: 90, fa1: 0 },
    B: { ...PUSH_UP, t: -13, th1: 167, sh1: 167, ua1: 90, fa1: 0 } },
  deadbug: {
    A: { pin: "P", at: [62, 94], t: 180, ua1: -90, fa1: -90, th1: -90, sh1: 0, ua2: -90, fa2: -90, th2: -90, sh2: 0 },
    B: { pin: "P", at: [62, 94], t: 180, ua1: -160, fa1: -165, th1: -8, sh1: -8, ua2: -90, fa2: -90, th2: -90, sh2: 0 } },
  carry: {
    A: { pin: "P", at: [55, 56], t: -90, th1: 75, sh1: 100, th2: 105, sh2: 85, ua1: 92, fa1: 90, ua2: 85, fa2: 95 },
    B: { pin: "P", at: [55, 56], t: -90, th1: 105, sh1: 85, th2: 75, sh2: 100, ua1: 92, fa1: 90, ua2: 95, fa2: 85 } },
  pallof: { A: st({ ua1: 80, fa1: -5 }), B: st({ ua1: 0, fa1: 0 }) },
  calf: { A: st({}), B: { ...STAND, at: [55, 94] } },
};

const D = Math.PI / 180;
const vec = (a, l) => [Math.cos(a * D) * l, Math.sin(a * D) * l];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

function full(p) {
  return { ...p, th2: p.th2 ?? p.th1, sh2: p.sh2 ?? p.sh1, ua2: p.ua2 ?? p.ua1, fa2: p.fa2 ?? p.fa1 };
}

function joints(p) {
  const P = [0, 0], N = vec(p.t, L.torso);
  const J = { P, N, H: add(N, vec(p.t, L.head)) };
  J.K1 = add(P, vec(p.th1, L.thigh)); J.F1 = add(J.K1, vec(p.sh1, L.shin));
  J.K2 = add(P, vec(p.th2, L.thigh)); J.F2 = add(J.K2, vec(p.sh2, L.shin));
  J.E1 = add(N, vec(p.ua1, L.ua)); J.W1 = add(J.E1, vec(p.fa1, L.fa));
  J.E2 = add(N, vec(p.ua2, L.ua)); J.W2 = add(J.E2, vec(p.fa2, L.fa));
  const pin = J[p.pin], dx = p.at[0] - pin[0], dy = p.at[1] - pin[1];
  for (const k in J) J[k] = [J[k][0] + dx, J[k][1] + dy];
  return J;
}

const lerp = (a, b, u) => a + (b - a) * u;
const lerpAngle = (a, b, u) => a + ((((b - a) % 360) + 540) % 360 - 180) * u;
const ANGLES = ["t", "th1", "sh1", "th2", "sh2", "ua1", "fa1", "ua2", "fa2"];

function pose(anim, u) {
  const A = full(anim.A), B = full(anim.B), p = { pin: A.pin, at: [lerp(A.at[0], B.at[0], u), lerp(A.at[1], B.at[1], u)] };
  for (const k of ANGLES) p[k] = lerpAngle(A[k], B[k], u);
  return p;
}

const PROPS = {
  bar: '<line x1="28" y1="6" x2="102" y2="6" class="fg-prop" stroke-width="3"/>',
  table: '<path d="M52 56 H118 M58 56 V100 M112 56 V100" class="fg-prop" stroke-width="3"/>',
  chair: '<path d="M12 68 H42 M14 68 V100 M40 68 V100 M12 68 V44" class="fg-prop" stroke-width="3"/>',
  bench: '<path d="M32 79 H90 M38 79 V100 M84 79 V100" class="fg-prop" stroke-width="4"/>',
  seat: '<path d="M36 81 H64 M50 81 V100" class="fg-prop" stroke-width="3"/>',
};

// SVG-Markup einer Figur; animiert wird sie über mountFigures()
export function figure(animKey, prop, cls = "") {
  const a = ANIMS[animKey] ? animKey : "squat";
  const anim = ANIMS[a];
  return `<svg class="fig ${cls}" viewBox="0 0 120 112" data-anim="${a}" data-prop="${prop || ""}" aria-hidden="true">
    ${anim.floor === false ? "" : '<line x1="4" y1="101.5" x2="116" y2="101.5" class="fg-floor"/>'}
    ${(anim.props || []).map(k => PROPS[k]).join("")}
    <path class="fg-far" data-k="leg2"/><path class="fg-far" data-k="arm2"/>
    <path class="fg-body" data-k="torso"/><path class="fg-body" data-k="leg1"/>
    <circle class="fg-head" r="6" data-k="head"/>
    <path class="fg-body" data-k="arm1"/>
    ${prop === "kb" ? '<g data-k="prop"><circle r="5.2" cy="5.5" class="fg-fill"/><circle r="2.6" class="fg-handle"/></g>' : ""}
    ${prop === "db" ? '<g data-k="prop"><circle r="4.2" class="fg-fill"/></g>' : ""}
    ${prop === "bb" ? '<g data-k="prop"><circle r="8.5" class="fg-plate"/></g>' : ""}
  </svg>`;
}

function draw(f, u) {
  const J = joints(pose(f.anim, u)), q = f.q;
  const pt = p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  q.torso.setAttribute("d", `M${pt(J.P)} L${pt(J.N)}`);
  q.leg1.setAttribute("d", `M${pt(J.P)} L${pt(J.K1)} L${pt(J.F1)}`);
  q.leg2.setAttribute("d", `M${pt(J.P)} L${pt(J.K2)} L${pt(J.F2)}`);
  q.arm1.setAttribute("d", `M${pt(J.N)} L${pt(J.E1)} L${pt(J.W1)}`);
  q.arm2.setAttribute("d", `M${pt(J.N)} L${pt(J.E2)} L${pt(J.W2)}`);
  q.head.setAttribute("cx", J.H[0].toFixed(1)); q.head.setAttribute("cy", J.H[1].toFixed(1));
  if (q.prop) {
    // Gewicht hängt in Unterarmrichtung an der Hand
    const dx = J.W1[0] - J.E1[0], dy = J.W1[1] - J.E1[1], len = Math.hypot(dx, dy) || 1;
    const rot = Math.atan2(dy, dx) / D - 90;
    q.prop.setAttribute("transform", `translate(${(J.W1[0] + dx / len * 1.5).toFixed(1)} ${(J.W1[1] + dy / len * 1.5).toFixed(1)}) rotate(${rot.toFixed(0)})`);
  }
}

const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
function phase(ms) {
  const c = ms % 2800;
  if (c < 350) return 0;
  if (c < 1450) return ease((c - 350) / 1100);
  if (c < 1800) return 1;
  return 1 - ease((c - 1800) / 1000);
}

const live = new Set();
let raf = 0;
const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountFigures(root = document) {
  root.querySelectorAll("svg.fig:not([data-live])").forEach(el => {
    el.dataset.live = "1";
    const q = {};
    el.querySelectorAll("[data-k]").forEach(n => { q[n.dataset.k] = n; });
    const f = { el, anim: ANIMS[el.dataset.anim], q };
    draw(f, still() ? 0.5 : 0);
    if (!still()) live.add(f);
  });
  if (!raf && live.size) raf = requestAnimationFrame(loop);
}

function loop(ts) {
  for (const f of live) {
    if (!f.el.isConnected) { live.delete(f); continue; }
    draw(f, phase(ts));
  }
  raf = live.size ? requestAnimationFrame(loop) : 0;
}
