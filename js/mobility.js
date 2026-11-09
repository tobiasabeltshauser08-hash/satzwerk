// Aufwärmen und Dehnen passend zum Trainingstag: ohne DOM, damit es sich mit Node testen lässt
// Item: { id, n, sec, side, txt, cue }; sec = Dauer gesamt (bei side beide Seiten), 0 = ohne Timer

// Dynamische Mobilität: f = passende Muster, r = Bereich, t = benötigtes Gerät
const DRILLS = [
  { id: "m-hocke", n: "Tiefe Hocke mit Aufrichten", r: "bein", f: ["squat", "hinge", "lunge"], sec: 45,
    txt: "Zehen greifen, Po tief in die Hocke, Brust aufrichten, dann Beine strecken. Langsam im Wechsel.", cue: "Fersen bleiben am Boden." },
  { id: "m-rotation", n: "Ausfallschritt mit Rotation", r: "bein", f: ["lunge", "squat", "hinge"], sec: 60, side: true,
    txt: "Großer Ausfallschritt, Hand innen neben den Fuß, anderen Arm zur Decke drehen. 5 pro Seite.", cue: "Hinteres Bein lang, ruhig ausatmen beim Drehen." },
  { id: "m-hueftbeuge", n: "Hüftbeuge ohne Gewicht", r: "bein", f: ["hinge", "legcurl"], sec: 45,
    txt: "Hände an die Hüfte, Po nach hinten schieben, bis es hinten im Oberschenkel zieht, dann aufrichten.", cue: "Rücken gerade, Knie nur leicht gebeugt." },
  { id: "m-beinpendel", n: "Beinpendel", r: "bein", f: ["hinge", "legcurl", "lunge"], sec: 40, side: true,
    txt: "An der Wand abstützen und ein Bein locker vor und zurück schwingen, dann seitlich.", cue: "Oberkörper bleibt ruhig, Schwung langsam steigern." },
  { id: "m-knoechel", n: "Sprunggelenk an der Wand", r: "bein", f: ["squat", "lunge", "calves"], sec: 40, side: true,
    txt: "Fuß eine Handbreit vor der Wand, Knie über die Zehen zur Wand schieben und zurück. 10 pro Seite.", cue: "Ferse bleibt am Boden." },
  { id: "m-bruecke", n: "Glute Bridge zum Aktivieren", r: "bein", f: ["hinge", "squat", "legcurl"], sec: 40,
    txt: "Rückenlage, Füße aufgestellt, Hüfte hochdrücken, oben kurz halten. 10 ruhige Wiederholungen.", cue: "Po anspannen, nicht ins Hohlkreuz." },

  { id: "m-armkreisen", n: "Großes Armkreisen", r: "push", f: ["hpush", "vpush", "shoulder", "hpull"], sec: 40,
    txt: "Arme gestreckt in großen Kreisen führen, 10 vorwärts und 10 rückwärts.", cue: "Schultern weg von den Ohren." },
  { id: "m-wandengel", n: "Wandengel", r: "push", f: ["vpush", "shoulder", "vpull"], sec: 45,
    txt: "Rücken an die Wand, Arme als U anlegen und langsam nach oben schieben und zurück. 8–10 Wdh.", cue: "Unterer Rücken bleibt an der Wand." },
  { id: "m-openbook", n: "Brustwirbelsäule öffnen", r: "push", f: ["hpush", "vpush", "triceps", "hpull"], sec: 60, side: true,
    txt: "Seitlich liegen, Knie gebeugt, oberen Arm wie ein Buch zur anderen Seite aufklappen. 6 pro Seite.", cue: "Knie bleiben zusammen, Blick folgt der Hand." },
  { id: "m-skapula-ls", n: "Schulterblatt-Liegestütz", r: "push", f: ["hpush", "triceps", "shoulder"], sec: 40,
    txt: "Im hohen Stütz die Arme gestreckt lassen, Schulterblätter zusammen und auseinander schieben. 10 Wdh.", cue: "Nur die Schulterblätter bewegen sich." },

  { id: "m-katzekuh", n: "Katze-Kuh", r: "pull", f: ["hpull", "vpull", "core"], sec: 45,
    txt: "Im Vierfüßlerstand den Rücken abwechselnd rund machen und sanft durchhängen lassen.", cue: "Langsam, mit dem Atem bewegen." },
  { id: "m-w-ziehen", n: "W-Rudern im Stand", r: "pull", f: ["hpull", "biceps", "shoulder", "vpull"], sec: 40,
    txt: "Arme nach vorn strecken, Ellbogen als W nach hinten ziehen, Schulterblätter zusammen. 12 Wdh.", cue: "Kurz halten, Schultern bleiben unten." },
  { id: "m-latschaukel", n: "Lat-Schaukel im Vierfüßler", r: "pull", f: ["vpull", "hpull"], sec: 45,
    txt: "Hände weit nach vorn, Po langsam zu den Fersen schieben und zurück. 8 ruhige Wiederholungen.", cue: "Brust sinkt zum Boden, Arme lang." },
  { id: "m-skapula-hang", n: "Schulterblatt-Klimmzug", r: "pull", f: ["vpull", "hpull", "biceps"], sec: 40, t: "stange",
    txt: "An der Stange hängen und nur die Schulterblätter nach unten ziehen, Arme bleiben gestreckt. 8 Wdh.", cue: "Kein Schwung, kurz oben halten." },

  { id: "m-deadbug", n: "Dead Bug langsam", r: "rumpf", f: ["core"], sec: 45,
    txt: "Rückenlage, Arm und Gegenbein langsam ausstrecken und zurück, im Wechsel. 8 pro Seite.", cue: "Unterer Rücken bleibt am Boden." },
  { id: "m-birddog", n: "Bird Dog", r: "rumpf", f: ["core", "hinge"], sec: 45,
    txt: "Im Vierfüßlerstand Arm und Gegenbein lang strecken, kurz halten, im Wechsel. 6 pro Seite.", cue: "Becken bleibt gerade." },
];

// Statische Dehnungen: 30 s pro Seite, 45 s beidseitig
const STRETCHES = [
  { id: "d-quad", n: "Oberschenkel vorne", r: "bein", f: ["squat", "lunge"], side: true,
    txt: "Im Stand eine Ferse zum Po ziehen, Knie zeigen nach unten, mit der anderen Hand an der Wand halten.", cue: "Po leicht anspannen, kein Hohlkreuz." },
  { id: "d-hamstring", n: "Oberschenkel hinten", r: "bein", f: ["hinge", "legcurl"], side: true,
    txt: "Ferse auf eine Stufe, Bein gestreckt, mit geradem Rücken aus der Hüfte nach vorn neigen.", cue: "Ziehen ja, Schmerz nein." },
  { id: "d-hueftbeuger", n: "Hüftbeuger im Kniestand", r: "bein", f: ["lunge", "squat", "hinge"], side: true,
    txt: "Ein Knie am Boden, anderer Fuß vorn. Po anspannen und die Hüfte sanft nach vorn schieben.", cue: "Oberkörper aufrecht, ruhig atmen." },
  { id: "d-gesaess", n: "Gesäß in Rückenlage", r: "bein", f: ["hinge", "squat", "lunge"], side: true,
    txt: "Rückenlage, Knöchel auf das andere Knie legen und das untere Bein sanft zur Brust ziehen.", cue: "Kopf und Schultern bleiben entspannt am Boden." },
  { id: "d-wade", n: "Wade an der Wand", r: "bein", f: ["calves", "squat", "lunge"], side: true,
    txt: "Hände an die Wand, ein Bein gestreckt nach hinten, Ferse in den Boden drücken.", cue: "Fußspitze zeigt nach vorn." },

  { id: "d-brust", n: "Brust im Türrahmen", r: "push", f: ["hpush", "shoulder"], side: true,
    txt: "Unterarm auf Schulterhöhe an den Türrahmen legen und den Oberkörper sanft wegdrehen.", cue: "Schulter bleibt unten, nicht ins Gelenk drücken." },
  { id: "d-schulter", n: "Schulter quer vor der Brust", r: "push", f: ["vpush", "shoulder", "hpull"], side: true,
    txt: "Einen Arm gestreckt vor der Brust zur anderen Seite ziehen, mit der Hand über dem Ellbogen.", cue: "Schulter tief halten." },
  { id: "d-trizeps", n: "Trizeps über Kopf", r: "push", f: ["triceps", "vpush"], side: true,
    txt: "Hand hinter den Kopf zwischen die Schulterblätter, mit der anderen Hand den Ellbogen sanft ziehen.", cue: "Kopf aufrecht, nicht nach vorn drücken." },

  { id: "d-lat", n: "Lat am Türrahmen", r: "pull", f: ["vpull", "hpull"], side: true,
    txt: "Türrahmen über Kopf greifen, Hüfte zur Seite schieben, bis es seitlich am Rücken zieht.", cue: "Ruhig in die Flanke atmen." },
  { id: "d-bizeps", n: "Bizeps an der Wand", r: "pull", f: ["biceps", "hpull"], side: true,
    txt: "Handfläche auf Schulterhöhe an die Wand, Arm gestreckt, Oberkörper langsam wegdrehen.", cue: "Ellbogen nicht überstrecken." },
  { id: "d-ruecken", n: "Oberer Rücken rund", r: "pull", f: ["hpull", "vpull"],
    txt: "Hände vor der Brust verschränken, nach vorn schieben und den oberen Rücken rund machen.", cue: "Kinn leicht zur Brust, ruhig atmen." },

  { id: "d-kind", n: "Kindhaltung", r: "rumpf", f: ["core", "vpull", "hinge"],
    txt: "Im Fersensitz die Arme weit nach vorn strecken und die Stirn auf den Boden legen.", cue: "Ausatmen und den Rücken lang werden lassen." },
  { id: "d-kobra", n: "Sanfte Kobra", r: "rumpf", f: ["core"],
    txt: "Bauchlage, Unterarme unter den Schultern, Oberkörper sanft aufrichten, Becken bleibt am Boden.", cue: "Nur so weit, wie es im Rücken angenehm ist." },
];
const stretchSec = s => s.side ? 60 : 45;

// Gewicht je Muster: Hauptübungen zählen dreifach
function patternWeights(day) {
  const w = {};
  for (const r of day.rows || []) { const p = r.ex?.p; if (p) w[p] = (w[p] || 0) + (r.main ? 3 : 1); }
  return w;
}
// Passende Auswahl: beste Übung zuerst, jede weitere aus demselben Bereich zählt weniger (ausgewogen bei Ganzkörper).
// Das erste Muster einer Übung zählt voll, weitere nur zum Teil; mit vorhandenem Gerät etwas mehr.
// Reicht es nicht, wird mit allgemeinen Übungen aufgefüllt.
function pick(list, weights, n, fill) {
  const score = x => x.f.reduce((a, p, i) => a + (weights[p] || 0) * (i ? 0.6 : 1), 0) * (x.t ? 1.3 : 1);
  const out = [], perRegion = {};
  while (out.length < n) {
    let best = null, bestV = 0;
    for (const x of list) {
      if (out.includes(x) || (x.r === "rumpf" && perRegion.rumpf)) continue;
      const v = score(x) * 0.6 ** (perRegion[x.r] || 0);
      if (v > bestV) { best = x; bestV = v; }
    }
    if (!best) break;
    out.push(best); perRegion[best.r] = (perRegion[best.r] || 0) + 1;
  }
  for (const id of fill) { const x = list.find(y => y.id === id); if (out.length < n && x && !out.includes(x)) out.push(x); }
  return out;
}
const item = (x, sec = x.sec) => ({ id: x.id, n: x.n, sec, side: !!x.side, txt: x.txt, cue: x.cue });
const byId = (list, ids) => ids.map(id => list.find(x => x.id === id));

// ---------- Aufwärmen ----------
const PULSE = {
  seil: { id: "w-seil", n: "Seilspringen locker", sec: 90, txt: "Locker auf den Fußballen springen, zwischendurch abwechselnd auf einem Bein.", cue: "Kleine Sprünge, Schultern locker." },
  cardio: { id: "w-geraet", n: "Cardiogerät locker", sec: 120, txt: "Laufband, Rad oder Rudergerät in ruhigem Tempo, in der zweiten Minute etwas zügiger.", cue: "Leicht ins Schwitzen kommen, nicht außer Atem." },
  hampel: { id: "w-hampel", n: "Hampelmänner und Laufen", sec: 90, txt: "Abwechselnd 30 s Hampelmänner und 15 s auf der Stelle laufen mit Knieheben.", cue: "Leicht ins Schwitzen kommen, nicht außer Atem." },
  sanft: { id: "w-stelle", n: "Auf der Stelle laufen", sec: 90, txt: "Locker auf der Stelle gehen und laufen, Arme mitschwingen, Knie langsam höher ziehen.", cue: "Ohne Springen, Tempo langsam steigern." },
};
const WEIGHTED = ["kb", "kh", "lh", "kabel", "masch"];
function rampItem(ex, goal) {
  const kb = ex.t.includes("kb") && !ex.t.some(t => ["kh", "lh", "kabel", "masch"].includes(t));
  const txt = !ex.t.some(t => WEIGHTED.includes(t)) ? "1 leichter Satz mit 5 Wdh. in einfacher Variante, z. B. mit kleinerem Bewegungsumfang."
    : kb ? "1 Satz mit 5 Wdh. und leichterer Kettlebell oder halbem Tempo, dann 1 Satz mit 3 Wdh. Arbeitsgewicht."
    : goal === "kraft" ? "Je 1 Satz mit ca. 50 %, 70 % und 85 % des Arbeitsgewichts, mit 5, 3 und 1 Wdh."
    : "1 Satz mit ca. 50 % und 1 Satz mit ca. 70 % des Arbeitsgewichts, je 5 Wdh.";
  return { id: "w-rampe", n: `Rampensätze: ${ex.n}`, sec: 0, side: false, txt, cue: "Saubere Technik, nicht ermüden. Danach geht es los." };
}

const RUN_HARD = ["hiit", "int", "tempo"];
const RUN_ITEMS = {
  gehen: { id: "w-gehen", n: "Zügig gehen", sec: 120, txt: "Zwei Minuten zügig gehen, Arme aktiv mitschwingen.", cue: "Langsam anfangen, dann schneller werden." },
  gehen1: { id: "w-gehen", n: "Zügig gehen", sec: 60, txt: "Eine Minute zügig gehen, Arme aktiv mitschwingen.", cue: "Langsam anfangen, dann schneller werden." },
  abc: { id: "w-abc", n: "Lauf-ABC", sec: 60, txt: "Je 15 s Fußgelenkarbeit, Kniehebelauf, Anfersen und Hopserlauf, dazwischen kurz gehen.", cue: "Aufrecht, kurze Bodenkontakte." },
  abc1: { id: "w-abc", n: "Knieheben und Anfersen", sec: 45, txt: "Im Gehen abwechselnd die Knie anheben und die Fersen zum Po führen.", cue: "Locker bleiben, nicht springen." },
  steiger: { id: "w-steiger", n: "Steigerungsläufe", sec: 90, txt: "3 × 20 s vom Traben bis fast zum Zieltempo steigern, zurück gehen.", cue: "Locker schnell, nicht sprinten." },
};

export function warmupFor(day, profile = {}) {
  const tools = profile?.tools || [];
  if (day.kind === "cardio" || day.kind === "run") {
    const hard = RUN_HARD.includes(day.key), gentle = day.key === "walk";
    const mob = byId(DRILLS, gentle ? ["m-beinpendel", "m-knoechel"] : ["m-beinpendel", "m-rotation", ...(hard ? [] : ["m-knoechel"])]).map(x => item(x));
    if (hard) return [item(RUN_ITEMS.gehen1), ...mob, item(RUN_ITEMS.abc), item(RUN_ITEMS.steiger)];
    return [item(RUN_ITEMS.gehen), ...mob, item(gentle ? RUN_ITEMS.abc1 : RUN_ITEMS.abc)];
  }
  const pulse = tools.includes("seil") ? PULSE.seil : tools.includes("cardio") ? PULSE.cardio : profile?.level === "1" ? PULSE.sanft : PULSE.hampel;
  const drills = pick(DRILLS.filter(x => !x.t || tools.includes(x.t)), patternWeights(day), +profile?.time <= 30 ? 3 : 4, ["m-katzekuh", "m-armkreisen", "m-hocke", "m-rotation"]);
  const rows = day.rows || [], first = (rows.find(r => r.main) || rows[0])?.ex;
  return [item(pulse), ...drills.map(x => item(x)), ...(first ? [rampItem(first, profile?.goal)] : [])];
}

// ---------- Dehnen ----------
const RUN_STRETCH = ["d-wade", "d-hueftbeuger", "d-quad", "d-hamstring", "d-gesaess"];
export function stretchFor(day, profile = {}) {
  if (day.kind === "cardio" || day.kind === "run") return byId(STRETCHES, RUN_STRETCH).map(x => item(x, stretchSec(x)));
  // 4–5 Dehnungen, aber mindestens 4 Minuten
  const out = [], min = +profile?.time <= 30 ? 4 : 5;
  for (const x of pick(STRETCHES, patternWeights(day), 6, ["d-kind", "d-hueftbeuger", "d-ruecken", "d-gesaess", "d-schulter", "d-quad"])) {
    if (out.length >= min && out.reduce((a, y) => a + y.sec, 0) >= 240) break;
    out.push(item(x, stretchSec(x)));
  }
  return out;
}

export const mobMinutes = items => Math.round(items.reduce((a, x) => a + (x.sec || 60), 0) / 60);
